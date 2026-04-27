import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, FlatList, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendChatMessage, ChatMessage, ActionData, AIChatSpecialist, SlotDate } from '@ayla/shared';

const HISTORY_KEY = '@ayla_chat_v1';
const MAX_HISTORY = 60;

const QUICK_PROMPTS = [
  { icon: '💅', text: 'Маникюр рядом со мной' },
  { icon: '💆', text: 'Найди массажиста сегодня' },
  { icon: '✂️', text: 'Стрижка в ближайшее время' },
  { icon: '👁️', text: 'Коррекция бровей до 1500 ₽' },
];

const WELCOME_MSG: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Привет! Я AI-ассистент Ayla 💜\n\nПомогу найти идеального мастера красоты, подобрать время и записаться онлайн. Просто напишите, что вам нужно!',
  ts: 0,
};

function makeId() { return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(dot, { toValue: -5, duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.delay(480 - i * 160),
        ]),
      ),
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={T.bubble}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={[T.dot, { transform: [{ translateY: dot }] }]} />
      ))}
    </View>
  );
}

const T = StyleSheet.create({
  bubble: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F0EDF8', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 12,
    alignSelf: 'flex-start', marginLeft: 12, marginBottom: 8,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#7B61FF' },
});

// ─── Specialist Card (inline) ─────────────────────────────────────────────────

function SpecialistCard({ specialist, onPress, onBook }: {
  specialist: AIChatSpecialist;
  onPress: () => void;
  onBook: () => void;
}) {
  const initials = `${specialist.first_name[0]}${specialist.last_name[0]}`;
  const hasSlot = specialist.next_slot_datetime != null;
  const nextSlot = hasSlot ? new Date(specialist.next_slot_datetime!) : null;
  const slotLabel = nextSlot
    ? `${String(nextSlot.getHours()).padStart(2, '0')}:${String(nextSlot.getMinutes()).padStart(2, '0')}`
    : null;

  return (
    <Pressable style={SP.card} onPress={onPress}>
      <View style={SP.top}>
        <View style={SP.avatar}>
          <Text style={SP.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={SP.name} numberOfLines={1}>
            {specialist.first_name} {specialist.last_name}
          </Text>
          <View style={SP.meta}>
            <Ionicons name="star" size={11} color="#F59E0B" />
            <Text style={SP.rating}>{specialist.rating.toFixed(1)}</Text>
            <Text style={SP.reviews}>({specialist.reviews_count})</Text>
            {specialist.distance_km != null && (
              <Text style={SP.dist}> · {specialist.distance_km.toFixed(1)} км</Text>
            )}
          </View>
        </View>
      </View>
      {specialist.top_service && (
        <View style={SP.service}>
          <Text style={SP.serviceName} numberOfLines={1}>{specialist.top_service.name}</Text>
          <Text style={SP.servicePrice}>{specialist.top_service.price.toLocaleString('ru-RU')} ₽</Text>
        </View>
      )}
      <View style={SP.footer}>
        {slotLabel && (
          <View style={SP.slotBadge}>
            <Ionicons name="time-outline" size={11} color="#7B61FF" />
            <Text style={SP.slotText}>{slotLabel}</Text>
          </View>
        )}
        <Pressable style={[SP.bookBtn, !hasSlot && SP.bookBtnDisabled]} onPress={hasSlot ? onBook : undefined}>
          <Text style={SP.bookBtnText}>{hasSlot ? 'Записаться' : 'Нет слотов'}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const SP = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#EDE8FF', marginBottom: 8, width: 220,
  },
  top: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 },
  avatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#EDE8FF',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#7B61FF' },
  name: { fontSize: 13, fontWeight: '700', color: '#1A1628', marginBottom: 2 },
  meta: { flexDirection: 'row', alignItems: 'center' },
  rating: { fontSize: 11, fontWeight: '700', color: '#F59E0B', marginLeft: 2 },
  reviews: { fontSize: 11, color: '#9CA3AF', marginLeft: 1 },
  dist: { fontSize: 11, color: '#9CA3AF' },
  service: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  serviceName: { fontSize: 12, color: '#4B5563', flex: 1, marginRight: 4 },
  servicePrice: { fontSize: 12, fontWeight: '700', color: '#1A1628' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  slotBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  slotText: { fontSize: 11, color: '#7B61FF', fontWeight: '600' },
  bookBtn: {
    backgroundColor: '#7B61FF', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  bookBtnDisabled: { backgroundColor: '#E5E5E5' },
  bookBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
});

// ─── Inline Slot Picker ───────────────────────────────────────────────────────

function InlineSlotPicker({ data, onSelect }: {
  data: Extract<ActionData, { type: 'slots' }>;
  onSelect: (date: string, time: string) => void;
}) {
  const [activeDate, setActiveDate] = useState(data.dates[0]?.date ?? '');
  const activeDateObj = data.dates.find(d => d.date === activeDate) ?? data.dates[0];

  return (
    <View style={SL.wrap}>
      <Text style={SL.header}>
        {data.service_name} · {data.service_price.toLocaleString('ru-RU')} ₽
      </Text>
      {/* Date tabs */}
      <View style={SL.tabs}>
        {data.dates.map(d => (
          <Pressable
            key={d.date}
            style={[SL.tab, d.date === activeDate && SL.tabActive]}
            onPress={() => setActiveDate(d.date)}
          >
            <Text style={[SL.tabText, d.date === activeDate && SL.tabTextActive]}>{d.label}</Text>
          </Pressable>
        ))}
      </View>
      {/* Time chips */}
      <View style={SL.times}>
        {(activeDateObj?.times ?? []).map(t => (
          <Pressable key={t} style={SL.chip} onPress={() => onSelect(activeDate, t)}>
            <Text style={SL.chipText}>{t}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const SL = StyleSheet.create({
  wrap: {
    backgroundColor: '#F8F7FF', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#EDE8FF',
  },
  header: { fontSize: 12, fontWeight: '700', color: '#7B61FF', marginBottom: 10 },
  tabs: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E5E5', backgroundColor: '#fff',
  },
  tabActive: { backgroundColor: '#7B61FF', borderColor: '#7B61FF' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  tabTextActive: { color: '#fff' },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#E5E5E5', backgroundColor: '#fff',
  },
  chipText: { fontSize: 13, fontWeight: '600', color: '#1A1628' },
});

// ─── Booking Confirmation Card ────────────────────────────────────────────────

function BookingConfirmCard({ data }: { data: Extract<ActionData, { type: 'booking_confirmation' }> }) {
  return (
    <View style={BC.card}>
      <View style={BC.icon}>
        <Ionicons name="checkmark" size={20} color="#fff" />
      </View>
      <Text style={BC.title}>Запись создана!</Text>
      <Text style={BC.row}>{data.specialist_name}</Text>
      <Text style={BC.row}>{data.service_name}</Text>
      <Text style={BC.row}>{data.date}, {data.time}</Text>
      <Text style={BC.price}>{data.price.toLocaleString('ru-RU')} ₽</Text>
    </View>
  );
}

const BC = StyleSheet.create({
  card: {
    backgroundColor: '#ECFDF5', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#BBF7D0', alignItems: 'center',
  },
  icon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  title: { fontSize: 15, fontWeight: '700', color: '#166534', marginBottom: 6 },
  row: { fontSize: 13, color: '#15803D', marginBottom: 2 },
  price: { fontSize: 15, fontWeight: '700', color: '#166534', marginTop: 4 },
});

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message, onSpecialistPress, onSpecialistBook, onSlotSelect }: {
  message: ChatMessage;
  onSpecialistPress: (id: string) => void;
  onSpecialistBook: (s: AIChatSpecialist) => void;
  onSlotSelect: (data: Extract<ActionData, { type: 'slots' }>, date: string, time: string) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <View style={[MB.row, isUser && MB.rowUser]}>
      {!isUser && (
        <View style={MB.aiAvatar}>
          <Ionicons name="sparkles" size={14} color="#7B61FF" />
        </View>
      )}
      <View style={[MB.bubble, isUser ? MB.userBubble : MB.aiBubble]}>
        {message.content.length > 0 && (
          <Text style={[MB.text, isUser && MB.textUser]}>{message.content}</Text>
        )}

        {/* Action data rendering */}
        {message.action_data?.type === 'specialists' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: message.content ? 10 : 0 }}
            contentContainerStyle={{ paddingRight: 4, gap: 8 }}
          >
            {message.action_data.specialists.map(s => (
              <SpecialistCard
                key={s.id}
                specialist={s}
                onPress={() => onSpecialistPress(s.id)}
                onBook={() => onSpecialistBook(s)}
              />
            ))}
          </ScrollView>
        )}

        {message.action_data?.type === 'slots' && (
          <View style={{ marginTop: message.content ? 10 : 0 }}>
            <InlineSlotPicker
              data={message.action_data as Extract<ActionData, { type: 'slots' }>}
              onSelect={(date, time) =>
                onSlotSelect(message.action_data as Extract<ActionData, { type: 'slots' }>, date, time)
              }
            />
          </View>
        )}

        {message.action_data?.type === 'booking_confirmation' && (
          <View style={{ marginTop: message.content ? 10 : 0 }}>
            <BookingConfirmCard data={message.action_data as Extract<ActionData, { type: 'booking_confirmation' }>} />
          </View>
        )}
      </View>
    </View>
  );
}

const MB = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 6, paddingHorizontal: 12 },
  rowUser: { justifyContent: 'flex-end' },
  aiAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#EDE8FF',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  bubble: { maxWidth: '82%', borderRadius: 18, padding: 12 },
  aiBubble: { backgroundColor: '#F0EDF8', borderBottomLeftRadius: 4 },
  userBubble: { backgroundColor: '#7B61FF', borderBottomRightRadius: 4 },
  text: { fontSize: 15, color: '#1A1628', lineHeight: 21 },
  textUser: { color: '#fff' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AIChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MSG]);
  const [streamingText, setStreamingText] = useState('');
  const [responding, setResponding] = useState(false);
  const [inputText, setInputText] = useState('');
  const listRef = useRef<FlatList>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const streamingTextRef = useRef('');

  // Load history on mount
  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY).then(raw => {
      if (!raw) return;
      try {
        const saved: ChatMessage[] = JSON.parse(raw);
        if (saved.length > 0) setMessages([WELCOME_MSG, ...saved]);
      } catch {}
    });
  }, []);

  // Save history whenever messages change (skip welcome msg)
  useEffect(() => {
    const toSave = messages.filter(m => m.id !== 'welcome').slice(-MAX_HISTORY);
    if (toSave.length > 0) {
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(toSave)).catch(() => {});
    }
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, []);

  const handleSend = useCallback((text: string) => {
    const msg = text.trim();
    if (!msg || responding) return;
    setInputText('');

    const userMsg: ChatMessage = { id: makeId(), role: 'user', content: msg, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setStreamingText('');
    setResponding(true);
    streamingTextRef.current = '';

    let pendingAction: ActionData | undefined;

    abortRef.current = sendChatMessage(
      msg,
      chunk => {
        streamingTextRef.current += chunk;
        setStreamingText(streamingTextRef.current);
      },
      ad => { pendingAction = ad; },
      () => {
        const assistantMsg: ChatMessage = {
          id: makeId(),
          role: 'assistant',
          content: streamingTextRef.current,
          action_data: pendingAction,
          ts: Date.now(),
        };
        setMessages(prev => [...prev, assistantMsg]);
        setStreamingText('');
        setResponding(false);
        streamingTextRef.current = '';
      },
      err => {
        setResponding(false);
        setStreamingText('');
        streamingTextRef.current = '';
        Alert.alert('Ошибка', 'Не удалось получить ответ. Попробуйте снова.');
      },
    );
  }, [responding]);

  const handleClear = useCallback(() => {
    Alert.alert('Очистить историю?', 'Вся история диалога будет удалена.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Очистить',
        style: 'destructive',
        onPress: () => {
          abortRef.current?.();
          setMessages([WELCOME_MSG]);
          setStreamingText('');
          setResponding(false);
          streamingTextRef.current = '';
          AsyncStorage.removeItem(HISTORY_KEY);
        },
      },
    ]);
  }, []);

  const handleSpecialistPress = useCallback((id: string) => {
    router.push(`/profile/${id}` as any);
  }, [router]);

  const handleSpecialistBook = useCallback((specialist: AIChatSpecialist) => {
    if (!specialist.top_service) return;
    router.push({
      pathname: '/booking/slots',
      params: {
        specialist_id: specialist.id,
        specialist_name: `${specialist.first_name} ${specialist.last_name}`,
        service_id: 's1',
        service_name: specialist.top_service.name,
        service_price: String(specialist.top_service.price),
        service_duration: String(specialist.top_service.duration_minutes),
      },
    } as any);
  }, [router]);

  const handleSlotSelect = useCallback((data: Extract<ActionData, { type: 'slots' }>, date: string, time: string) => {
    router.push({
      pathname: '/booking/summary',
      params: {
        specialist_id: data.specialist_id,
        specialist_name: data.specialist_name,
        service_id: data.service_id,
        service_name: data.service_name,
        service_price: String(data.service_price),
        service_duration: String(data.service_duration),
        date,
        time,
      },
    } as any);
  }, [router]);

  // Build display list (append virtual streaming message)
  const displayMessages: ChatMessage[] = responding || streamingText
    ? [...messages, { id: 'streaming', role: 'assistant', content: streamingText, ts: Date.now() }]
    : messages;

  const showQuickPrompts = messages.length <= 1 && !responding;

  return (
    <KeyboardAvoidingView
      style={S.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={S.header}>
        <View style={S.headerLeft}>
          <View style={S.aiDot} />
          <View>
            <Text style={S.headerTitle}>AI Ассистент</Text>
            <Text style={S.headerSub}>Ayla · всегда онлайн</Text>
          </View>
        </View>
        <Pressable onPress={handleClear} hitSlop={12}>
          <Ionicons name="trash-outline" size={20} color="#9CA3AF" />
        </Pressable>
      </View>

      {/* Message list */}
      <FlatList
        ref={listRef}
        data={displayMessages}
        keyExtractor={m => m.id}
        contentContainerStyle={S.listContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
        ListFooterComponent={
          responding && streamingText.length === 0 ? (
            <TypingIndicator />
          ) : null
        }
        renderItem={({ item: message }) => (
          <MessageBubble
            message={message}
            onSpecialistPress={handleSpecialistPress}
            onSpecialistBook={handleSpecialistBook}
            onSlotSelect={handleSlotSelect}
          />
        )}
      />

      {/* Quick prompts */}
      {showQuickPrompts && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={S.quickScroll}
          contentContainerStyle={S.quickContent}
        >
          {QUICK_PROMPTS.map(p => (
            <Pressable
              key={p.text}
              style={S.quickChip}
              onPress={() => handleSend(p.text)}
            >
              <Text style={S.quickIcon}>{p.icon}</Text>
              <Text style={S.quickText}>{p.text}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Input bar */}
      <View style={S.inputBar}>
        <TextInput
          style={S.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Напишите сообщение..."
          placeholderTextColor="#B0A8C8"
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={() => handleSend(inputText)}
          blurOnSubmit={false}
          editable={!responding}
        />
        <Pressable
          style={[S.sendBtn, (!inputText.trim() || responding) && S.sendBtnDisabled]}
          onPress={() => handleSend(inputText)}
          disabled={!inputText.trim() || responding}
        >
          <Ionicons
            name="send"
            size={18}
            color={inputText.trim() && !responding ? '#fff' : '#C4B5FD'}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFA' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0EDF8',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E',
    shadowColor: '#22C55E', shadowOpacity: 0.5, shadowRadius: 4, elevation: 3,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1A1628' },
  headerSub: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },

  listContent: { paddingTop: 12, paddingBottom: 8 },

  quickScroll: { flexGrow: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0EDF8' },
  quickContent: { padding: 12, gap: 8 },
  quickChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: '#F3F0FF', borderRadius: 20,
    borderWidth: 1, borderColor: '#EDE8FF',
  },
  quickIcon: { fontSize: 14 },
  quickText: { fontSize: 13, fontWeight: '600', color: '#7B61FF' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0EDF8',
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
  },
  input: {
    flex: 1, maxHeight: 110, minHeight: 42,
    backgroundColor: '#F5F3FF', borderRadius: 21,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
    fontSize: 15, color: '#1A1628', lineHeight: 20,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#7B61FF', alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#EDE8FF' },
});
