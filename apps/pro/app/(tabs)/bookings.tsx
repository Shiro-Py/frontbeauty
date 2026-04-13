import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, RefreshControl,
  SectionList, StyleSheet, Text, View,
} from 'react-native';
import { router } from 'expo-router';
import { getProAppointments, ProAppointment, BookingStatus } from '@beautygo/shared';

// ─── Constants ────────────────────────────────────────────────────────────────

type Tab = 'today' | 'upcoming' | 'history';

const TABS: { key: Tab; label: string }[] = [
  { key: 'today',    label: 'Сегодня' },
  { key: 'upcoming', label: 'Ближайшие' },
  { key: 'history',  label: 'История' },
];

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; dot: string }> = {
  pending:          { label: 'Ждёт подтверждения', color: '#F59E0B', dot: '🟠' },
  awaiting_payment: { label: 'Ждёт оплаты',         color: '#EAB308', dot: '🟡' },
  confirmed:        { label: 'Подтверждена',         color: '#22C55E', dot: '🟢' },
  in_progress:      { label: 'В процессе',           color: '#3B82F6', dot: '🔵' },
  completed:        { label: 'Завершена',             color: '#6B7280', dot: '⚫' },
  cancelled:        { label: 'Отменена',              color: '#EF4444', dot: '🔴' },
  no_show:          { label: 'Клиент не пришёл',      color: '#374151', dot: '⚫' },
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toLocalDateStr(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { timeZone: undefined }).split('.').reverse().join('-');
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}
function addDaysStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}
function localTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function sectionLabel(dateStr: string): string {
  const today = todayStr();
  const tomorrow = addDaysStr(1);
  if (dateStr === today) {
    const d = new Date(dateStr + 'T00:00:00');
    return `СЕГОДНЯ · ${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`;
  }
  if (dateStr === tomorrow) {
    const d = new Date(dateStr + 'T00:00:00');
    return `ЗАВТРА · ${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`;
  }
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' }).toUpperCase();
}

function groupByDate(items: ProAppointment[]): { title: string; data: ProAppointment[] }[] {
  const map = new Map<string, ProAppointment[]>();
  for (const a of items) {
    const key = a.start_datetime.split('T')[0];
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ title: sectionLabel(date), data }));
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BookingStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <Text style={[S.badge, { color: cfg.color }]}>
      {cfg.dot} {cfg.label}
    </Text>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <View style={S.skeletonWrap}>
      {[1, 2, 3].map(i => (
        <View key={i} style={S.skeletonCard}>
          <View style={[S.skLine, { width: '30%', height: 13 }]} />
          <View style={[S.skLine, { width: '60%', height: 16, marginTop: 6 }]} />
          <View style={[S.skLine, { width: '45%', height: 13, marginTop: 6 }]} />
        </View>
      ))}
    </View>
  );
}

// ─── Appointment card ─────────────────────────────────────────────────────────

function AppCard({ item }: { item: ProAppointment }) {
  return (
    <Pressable style={S.card} onPress={() => router.push(`/booking/${item.id}` as any)}>
      <View style={S.cardTop}>
        <Text style={S.cardTime}>{localTime(item.start_datetime)}</Text>
        <Text style={S.cardService} numberOfLines={1}>{item.service_name}</Text>
        <Text style={S.cardPrice}>{item.price.toLocaleString('ru-RU')} ₽</Text>
      </View>
      <Text style={S.cardClient}>{item.client_name}{item.client_phone ? ` · ${item.client_phone}` : ''}</Text>
      <StatusBadge status={item.status} />
    </Pressable>
  );
}

// ─── Today tab ────────────────────────────────────────────────────────────────

function TodayTab() {
  const [items, setItems] = useState<ProAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const sections = groupByDate(items);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const today = todayStr();
      const { results } = await getProAppointments({ date_from: today, date_to: today });
      setItems(results);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Skeleton />;

  return (
    <SectionList
      sections={sections}
      keyExtractor={a => a.id}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#4A3DB0" />}
      renderSectionHeader={({ section }) => (
        <View style={S.sectionHeader}><Text style={S.sectionHeaderText}>{section.title}</Text></View>
      )}
      renderItem={({ item }) => <AppCard item={item} />}
      ItemSeparatorComponent={() => <View style={S.separator} />}
      ListEmptyComponent={
        <View style={S.empty}>
          <Text style={S.emptyTitle}>Сегодня записей нет</Text>
          <Text style={S.emptySub}>Записи клиентов появятся здесь</Text>
        </View>
      }
    />
  );
}

// ─── Upcoming tab ─────────────────────────────────────────────────────────────

const UPCOMING_STATUSES = 'pending,awaiting_payment,confirmed,in_progress';

function UpcomingTab() {
  const [items, setItems] = useState<ProAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const sections = groupByDate(items);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const tomorrow = addDaysStr(1);
      const in7 = addDaysStr(7);
      const { results } = await getProAppointments({ date_from: tomorrow, date_to: in7, status: UPCOMING_STATUSES });
      setItems(results);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Skeleton />;

  return (
    <SectionList
      sections={sections}
      keyExtractor={a => a.id}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#4A3DB0" />}
      renderSectionHeader={({ section }) => (
        <View style={S.sectionHeader}><Text style={S.sectionHeaderText}>{section.title}</Text></View>
      )}
      renderItem={({ item }) => <AppCard item={item} />}
      ItemSeparatorComponent={() => <View style={S.separator} />}
      ListEmptyComponent={
        <View style={S.empty}>
          <Text style={S.emptyTitle}>Нет предстоящих записей</Text>
          <Text style={S.emptySub}>Записи на следующие 7 дней появятся здесь</Text>
        </View>
      }
    />
  );
}

// ─── History tab ──────────────────────────────────────────────────────────────

const HISTORY_STATUSES = 'completed,cancelled,no_show';
const PAGE_SIZE = 20;

function HistoryTab() {
  const [items, setItems] = useState<ProAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const page = useRef(1);
  const sections = groupByDate(items);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) { setRefreshing(true); page.current = 1; }
    try {
      const { results, next } = await getProAppointments({
        status: HISTORY_STATUSES, page: 1, page_size: PAGE_SIZE,
      });
      setItems(results.slice().reverse()); // descending
      setHasMore(!!next);
      page.current = 1;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page.current + 1;
      const { results, next: hasNext } = await getProAppointments({
        status: HISTORY_STATUSES, page: next, page_size: PAGE_SIZE,
      });
      setItems(prev => {
        const ids = new Set(prev.map(a => a.id));
        return [...prev, ...results.filter(a => !ids.has(a.id)).reverse()];
      });
      setHasMore(!!hasNext);
      page.current = next;
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => { load(); }, [load]);

  if (loading) return <Skeleton />;

  return (
    <SectionList
      sections={sections.slice().reverse()}
      keyExtractor={a => a.id}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#4A3DB0" />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      renderSectionHeader={({ section }) => (
        <View style={S.sectionHeader}><Text style={S.sectionHeaderText}>{section.title}</Text></View>
      )}
      renderItem={({ item }) => <AppCard item={item} />}
      ItemSeparatorComponent={() => <View style={S.separator} />}
      ListEmptyComponent={
        <View style={S.empty}>
          <Text style={S.emptyTitle}>История пуста</Text>
          <Text style={S.emptySub}>Завершённые записи появятся здесь</Text>
        </View>
      }
      ListFooterComponent={loadingMore ? <ActivityIndicator color="#4A3DB0" style={{ margin: 16 }} /> : null}
    />
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BookingsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('today');

  return (
    <View style={S.root}>
      {/* Header */}
      <View style={S.header}>
        <Text style={S.headerTitle}>Записи</Text>
      </View>

      {/* Tabs */}
      <View style={S.tabRow}>
        {TABS.map(t => (
          <Pressable
            key={t.key}
            style={[S.tab, activeTab === t.key && S.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={[S.tabText, activeTab === t.key && S.tabTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      <View style={S.content}>
        {activeTab === 'today'    && <TodayTab />}
        {activeTab === 'upcoming' && <UpcomingTab />}
        {activeTab === 'history'  && <HistoryTab />}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F7FF' },

  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#1A1628' },

  tabRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    alignItems: 'center', backgroundColor: '#EDE9FA',
  },
  tabActive: { backgroundColor: '#4A3DB0' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#fff' },

  content: { flex: 1 },

  sectionHeader: {
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#F8F7FF',
  },
  sectionHeaderText: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5 },

  card: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, gap: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTime: { fontSize: 13, fontWeight: '700', color: '#4A3DB0', width: 40 },
  cardService: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1A1628' },
  cardPrice: { fontSize: 13, fontWeight: '600', color: '#1A1628' },
  cardClient: { fontSize: 13, color: '#6B7280' },
  badge: { fontSize: 12, fontWeight: '500' },
  separator: { height: 1, backgroundColor: '#F0EFF8' },

  skeletonWrap: { paddingTop: 8 },
  skeletonCard: {
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0EFF8',
  },
  skLine: { borderRadius: 7, backgroundColor: '#EDE9FA' },

  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#1A1628' },
  emptySub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
});
