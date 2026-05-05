import { getApiClient } from './client';
import { IS_MOCK } from './mock';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AvatarSnapshot {
  id: string;
  image_url: string | null;
  face_type?: string;
  skin_tone?: string;
  created_at: string;
}

export interface WeeklyStats {
  calories_avg: number;
  master_visits: number;
  active_days: number;
}

export interface AvatarRecommendation {
  id: string;
  icon: string;
  title: string;
  description: string;
  service_name: string;
  specialist_id?: string;
  specialist_name?: string;
}

export interface AvatarData {
  current: AvatarSnapshot | null;
  history: AvatarSnapshot[];
  weekly_stats: WeeklyStats;
  recommendations: AvatarRecommendation[];
}

export interface AvatarAnalysis {
  snapshot: AvatarSnapshot;
  recommendations: AvatarRecommendation[];
}

// ─── Mock ─────────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString();
}

const MOCK_RECOMMENDATIONS: AvatarRecommendation[] = [
  {
    id: 'r1', icon: '💧',
    title: 'Нужно увлажнение',
    description: 'Кожа выглядит обезвоженной. Рекомендуем интенсивный уход за лицом.',
    service_name: 'Уход за лицом', specialist_id: '8', specialist_name: 'Дарья Федорова',
  },
  {
    id: 'r2', icon: '✨',
    title: 'Выравнивание тона',
    description: 'Заметна неравномерность тона. Пилинг или мезотерапия дадут видимый эффект.',
    service_name: 'Пилинг лица', specialist_id: '4', specialist_name: 'Елена Козлова',
  },
  {
    id: 'r3', icon: '🌿',
    title: 'Брови подчеркнут овал',
    description: 'Тип лица — овал. Правильная форма бровей усилит черты.',
    service_name: 'Коррекция бровей', specialist_id: '4', specialist_name: 'Елена Козлова',
  },
];

const MOCK_HISTORY: AvatarSnapshot[] = [
  { id: 'av1', image_url: null, face_type: 'Овал', skin_tone: 'Тёплый', created_at: daysAgo(60) },
  { id: 'av2', image_url: null, face_type: 'Овал', skin_tone: 'Тёплый', created_at: daysAgo(30) },
  { id: 'av3', image_url: null, face_type: 'Овал', skin_tone: 'Нейтральный', created_at: daysAgo(0) },
];

const MOCK_DATA: AvatarData = {
  current: MOCK_HISTORY[2],
  history: MOCK_HISTORY,
  weekly_stats: { calories_avg: 1750, master_visits: 2, active_days: 5 },
  recommendations: MOCK_RECOMMENDATIONS,
};

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─── API ──────────────────────────────────────────────────────────────────────

export async function getAvatarData(): Promise<AvatarData> {
  if (IS_MOCK) {
    await delay(400);
    return MOCK_DATA;
  }
  const api = getApiClient();
  const { data } = await api.get('/avatar/me/');
  return data;
}

export async function createAvatar(imageUri: string): Promise<AvatarAnalysis> {
  if (IS_MOCK) {
    await delay(3000);
    const snapshot: AvatarSnapshot = {
      id: `av${Date.now()}`,
      image_url: imageUri,
      face_type: 'Овал',
      skin_tone: 'Тёплый',
      created_at: new Date().toISOString(),
    };
    MOCK_DATA.current = snapshot;
    MOCK_DATA.history = [...MOCK_DATA.history, snapshot];
    return { snapshot, recommendations: MOCK_RECOMMENDATIONS };
  }
  const api = getApiClient();
  const formData = new FormData();
  formData.append('image', { uri: imageUri, type: 'image/jpeg', name: 'avatar.jpg' } as any);
  const { data } = await api.post('/avatar/create/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
