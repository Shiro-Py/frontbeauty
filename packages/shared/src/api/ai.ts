import { BASE_URL } from './client';
import { tokenStorage } from '../storage/tokenStorage';
import { IS_MOCK } from './mock';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AIChatSpecialist {
  id: string;
  first_name: string;
  last_name: string;
  rating: number;
  reviews_count: number;
  distance_km?: number;
  top_service?: { name: string; price: number; duration_minutes: number };
  next_slot_datetime?: string | null;
}

export interface SlotDate {
  date: string;   // ISO YYYY-MM-DD
  label: string;  // «Сегодня», «Завтра», etc.
  times: string[];
}

export type ActionData =
  | {
      type: 'specialists';
      specialists: AIChatSpecialist[];
    }
  | {
      type: 'slots';
      specialist_id: string;
      specialist_name: string;
      service_id: string;
      service_name: string;
      service_price: number;
      service_duration: number;
      dates: SlotDate[];
    }
  | {
      type: 'booking_confirmation';
      specialist_name: string;
      service_name: string;
      date: string;
      time: string;
      price: number;
    };

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action_data?: ActionData;
  ts: number;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

function todayIso() { return new Date().toISOString().split('T')[0]; }
function tomorrowIso() {
  const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0];
}
function nextHours(h: number) {
  const d = new Date(); d.setHours(h, 0, 0, 0); return d.toISOString();
}

const MOCK_SPECIALISTS: AIChatSpecialist[] = [
  {
    id: '1', first_name: 'Мария', last_name: 'Иванова',
    rating: 4.8, reviews_count: 134, distance_km: 0.8,
    top_service: { name: 'Маникюр с гель-лаком', price: 1800, duration_minutes: 90 },
    next_slot_datetime: nextHours(18),
  },
  {
    id: '4', first_name: 'Елена', last_name: 'Козлова',
    rating: 5.0, reviews_count: 210, distance_km: 0.5,
    top_service: { name: 'Коррекция бровей', price: 800, duration_minutes: 45 },
    next_slot_datetime: nextHours(16),
  },
  {
    id: '8', first_name: 'Дарья', last_name: 'Федорова',
    rating: 4.9, reviews_count: 175, distance_km: 0.9,
    top_service: { name: 'Макияж дневной', price: 2000, duration_minutes: 60 },
    next_slot_datetime: nextHours(13),
  },
];

const MOCK_SLOTS_RESPONSE: ActionData = {
  type: 'slots',
  specialist_id: '1',
  specialist_name: 'Мария Иванова',
  service_id: 's1',
  service_name: 'Маникюр с гель-лаком',
  service_price: 1800,
  service_duration: 90,
  dates: [
    { date: todayIso(), label: 'Сегодня', times: ['10:00', '12:00', '14:30', '16:00', '18:00'] },
    { date: tomorrowIso(), label: 'Завтра', times: ['09:30', '11:00', '13:00', '15:30', '17:30'] },
  ],
};

function getMockResponse(message: string): { text: string; action_data?: ActionData } {
  const m = message.toLowerCase();

  if (/привет|здравств|добрый|хай/.test(m)) {
    return { text: 'Привет! Я AI-ассистент Ayla 💜 Помогу найти идеального мастера красоты. Расскажите, какую услугу вы ищете?' };
  }
  if (/слот|врем|когда|сегодня|завтра|свобод/.test(m)) {
    return {
      text: 'Вот доступные слоты у Марии Ивановой на маникюр:',
      action_data: MOCK_SLOTS_RESPONSE,
    };
  }
  if (/мастер|найди|специалист|кто|рядом|близ|район/.test(m)) {
    return {
      text: 'Нашла для вас мастеров поблизости:',
      action_data: { type: 'specialists', specialists: MOCK_SPECIALISTS },
    };
  }
  if (/маникюр|ноготь|гель/.test(m)) {
    return {
      text: 'У нас есть отличные мастера маникюра! Показать ближайших?',
      action_data: { type: 'specialists', specialists: MOCK_SPECIALISTS.slice(0, 2) },
    };
  }
  if (/массаж/.test(m)) {
    return { text: 'По массажу рекомендую Ольгу Смирнову — рейтинг 4.9, в 1.2 км. Хотите посмотреть её слоты?' };
  }
  if (/цена|сколько|стоим|бюджет/.test(m)) {
    return { text: 'Цены зависят от мастера: маникюр от 1200 ₽, стрижка от 800 ₽, массаж от 2000 ₽, коррекция бровей от 800 ₽. Назовите бюджет, подберу варианты!' };
  }
  if (/спасиб|отлично|класс|супер/.test(m)) {
    return { text: 'Пожалуйста! Если нужна помощь с записью — обращайтесь 😊' };
  }

  return { text: 'Понимаю! Уточните, пожалуйста, какую услугу ищете и в каком районе? Например: «маникюр у метро Арбатская» или «стрижка сегодня вечером» 💄' };
}

// ─── API ──────────────────────────────────────────────────────────────────────

export function sendChatMessage(
  message: string,
  onChunk: (text: string) => void,
  onActionData: (ad: ActionData) => void,
  onDone: () => void,
  onError: (err: Error) => void,
): () => void {
  const controller = new AbortController();

  if (IS_MOCK) {
    let cancelled = false;
    const { text, action_data } = getMockResponse(message);

    (async () => {
      const words = text.split(' ');
      for (let i = 0; i < words.length; i++) {
        if (cancelled) return;
        await new Promise(r => setTimeout(r, 35 + Math.random() * 45));
        onChunk((i === 0 ? '' : ' ') + words[i]);
      }
      if (!cancelled) {
        if (action_data) onActionData(action_data);
        onDone();
      }
    })();

    return () => { cancelled = true; };
  }

  (async () => {
    try {
      const [accessToken, anonymousToken] = await Promise.all([
        tokenStorage.getAccess(),
        tokenStorage.getAnonymous(),
      ]);
      const token = accessToken || anonymousToken;

      const response = await fetch(`${BASE_URL}/ai/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') { onDone(); return; }
          try {
            const parsed = JSON.parse(data);
            if (parsed.text !== undefined) onChunk(parsed.text);
            if (parsed.action_data) onActionData(parsed.action_data);
          } catch { /* skip malformed chunks */ }
        }
      }
      onDone();
    } catch (err: any) {
      if (err?.name !== 'AbortError') onError(err);
    }
  })();

  return () => controller.abort();
}
