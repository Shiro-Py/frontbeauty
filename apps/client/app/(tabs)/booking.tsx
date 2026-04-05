import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, FlatList,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getPastAppointments, getUpcomingAppointments,
  Booking, BookingStatus,
} from '@beautygo/shared';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS_LONG = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function formatDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS_LONG[m - 1]}`;
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending:   'Ожидает',
  confirmed: 'Подтверждена',
  completed: 'Завершено',
  cancelled: 'Отменено',
  no_show:   'Не пришёл',
};

const STATUS_COLOR: Record<BookingStatus, string> = {
  pending:   '#F59E0B',
  confirmed: '#7B61FF',
  completed: '#22C55E',
  cancelled: '#EF4444',
  no_show:   '#9CA3AF',
};

type Tab = 'upcoming' | 'past';

// ─── Card ─────────────────────────────────────────────────────────────────────

function PastBookingCard({ booking, onPress, onReview }: {
  booking: Booking;
  onPress: () => void;
  onReview?: () => void;
}) {
  const color = STATUS_COLOR[booking.status];
  const initials = booking.specialist_name.split(' ').map(w => w[0]).slice(0, 2).join('');
  const showReviewCTA = booking.status === 'completed' && booking.has_review === false;

  return (
    <Pressable style={S.card} onPress={onPress}>
      {/* Avatar */}
      <View style={S.avatarWrap}>
        <Text style={S.avatarInitials}>{initials}</Text>
      </View>

      {/* Main info */}
      <View style={S.cardBody}>
        <View style={S.cardTopRow}>
          <Text style={S.cardMaster} numberOfLines={1}>{booking.specialist_name}</Text>
          <View style={[S.statusBadge, { backgroundColor: color + '18' }]}>
            <Text style={[S.statusText, { color }]}>{STATUS_LABEL[booking.status]}</Text>
          </View>
        </View>

        <Text style={S.cardService} numberOfLines={1}>{booking.service_name}</Text>

        {booking.address ? (
          <View style={S.metaRow}>
            <Ionicons name="location-outline" size={12} color="#9CA3AF" />
            <Text style={S.metaText} numberOfLines={1}>{booking.address}</Text>
          </View>
        ) : null}

        <View style={S.metaRow}>
          <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
          <Text style={S.metaText}>{formatDate(booking.date)} · {booking.time}</Text>
          <Text style={S.cardPrice}>{booking.service_price.toLocaleString('ru-RU')} ₽</Text>
        </View>

        {/* "Оставить отзыв" CTA */}
        {showReviewCTA && (
          <Pressable
            style={S.reviewCTA}
            onPress={(e) => { e.stopPropagation?.(); onReview?.(); }}
          >
            <Ionicons name="star-outline" size={13} color="#7B61FF" />
            <Text style={S.reviewCTAText}>Оставить отзыв</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

function UpcomingCard({ booking, onPress }: { booking: Booking; onPress: () => void }) {
  const color = STATUS_COLOR[booking.status];
  const initials = booking.specialist_name.split(' ').map(w => w[0]).slice(0, 2).join('');

  return (
    <Pressable style={S.card} onPress={onPress}>
      <View style={S.avatarWrap}>
        <Text style={S.avatarInitials}>{initials}</Text>
      </View>
      <View style={S.cardBody}>
        <View style={S.cardTopRow}>
          <Text style={S.cardMaster} numberOfLines={1}>{booking.specialist_name}</Text>
          <View style={[S.statusBadge, { backgroundColor: color + '18' }]}>
            <Text style={[S.statusText, { color }]}>{STATUS_LABEL[booking.status]}</Text>
          </View>
        </View>
        <Text style={S.cardService} numberOfLines={1}>{booking.service_name}</Text>
        {booking.address ? (
          <View style={S.metaRow}>
            <Ionicons name="location-outline" size={12} color="#9CA3AF" />
            <Text style={S.metaText} numberOfLines={1}>{booking.address}</Text>
          </View>
        ) : null}
        <View style={S.metaRow}>
          <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
          <Text style={S.metaText}>{formatDate(booking.date)} · {booking.time}</Text>
          <Text style={S.cardPrice}>{booking.service_price.toLocaleString('ru-RU')} ₽</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <View style={S.empty}>
      <Ionicons
        name={tab === 'upcoming' ? 'calendar-outline' : 'time-outline'}
        size={52}
        color="#C8C2E8"
      />
      <Text style={S.emptyTitle}>
        {tab === 'upcoming' ? 'Нет предстоящих записей' : 'Нет записей'}
      </Text>
      <Text style={S.emptySub}>
        {tab === 'upcoming'
          ? 'Выберите мастера и запишитесь'
          : 'Завершённые и отменённые записи появятся здесь'}
      </Text>
      {tab === 'upcoming' && (
        <Pressable style={S.emptyBtn} onPress={() => router.push('/(tabs)/masters' as any)}>
          <Text style={S.emptyBtnText}>Найти мастера</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function MyBookingsScreen() {
  const [tab, setTab] = useState<Tab>('past');

  // ── Past tab state ────────────────────────────────────────────
  const [past, setPast] = useState<Booking[]>([]);
  const [pastLoading, setPastLoading] = useState(true);
  const [pastRefreshing, setPastRefreshing] = useState(false);
  const [pastPage, setPastPage] = useState(1);
  const [pastHasMore, setPastHasMore] = useState(true);
  const [pastLoadingMore, setPastLoadingMore] = useState(false);

  // ── Upcoming tab state ────────────────────────────────────────
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [upcomingRefreshing, setUpcomingRefreshing] = useState(false);

  const didLoad = useRef(false);

  const loadPast = useCallback(async (refresh = false) => {
    if (refresh) {
      setPastRefreshing(true);
    } else {
      setPastLoading(true);
    }
    try {
      const res = await getPastAppointments(1, PAGE_SIZE);
      setPast(res.results);
      setPastPage(1);
      setPastHasMore(!!res.next);
    } catch { /* ignore */ } finally {
      setPastLoading(false);
      setPastRefreshing(false);
    }
  }, []);

  const loadMorePast = async () => {
    if (pastLoadingMore || !pastHasMore) return;
    setPastLoadingMore(true);
    try {
      const next = pastPage + 1;
      const res = await getPastAppointments(next, PAGE_SIZE);
      setPast(prev => {
        const ids = new Set(prev.map(b => b.id));
        return [...prev, ...res.results.filter(b => !ids.has(b.id))];
      });
      setPastPage(next);
      setPastHasMore(!!res.next);
    } catch { /* ignore */ } finally {
      setPastLoadingMore(false);
    }
  };

  const loadUpcoming = useCallback(async (refresh = false) => {
    if (refresh) setUpcomingRefreshing(true);
    else setUpcomingLoading(true);
    try {
      const res = await getUpcomingAppointments();
      setUpcoming(res);
    } catch { /* ignore */ } finally {
      setUpcomingLoading(false);
      setUpcomingRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    if (!didLoad.current) {
      didLoad.current = true;
      loadPast();
      loadUpcoming();
    }
  }, [loadPast, loadUpcoming]));

  const handleTabRefresh = () => {
    if (tab === 'past') { setPastRefreshing(true); loadPast(true); }
    else { setUpcomingRefreshing(true); loadUpcoming(true); }
  };

  const navigateToDetail = (id: string) =>
    router.push({ pathname: '/booking/[id]', params: { id } } as any);

  const navigateToReview = (b: Booking) =>
    router.push({
      pathname: '/review/[id]',
      params: { id: b.specialist_id, master_name: b.specialist_name },
    } as any);

  const isRefreshing = tab === 'past' ? pastRefreshing : upcomingRefreshing;

  // ── Upcoming content ──────────────────────────────────────────────────────
  const renderUpcoming = () => {
    if (upcomingLoading) {
      return <ActivityIndicator color="#7B61FF" style={{ marginTop: 40 }} />;
    }
    if (upcoming.length === 0) return <EmptyState tab="upcoming" />;
    return (
      <FlatList
        data={upcoming}
        keyExtractor={b => b.id}
        contentContainerStyle={S.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={upcomingRefreshing} onRefresh={handleTabRefresh} tintColor="#7B61FF" />
        }
        renderItem={({ item }) => (
          <UpcomingCard booking={item} onPress={() => navigateToDetail(item.id)} />
        )}
      />
    );
  };

  // ── Past content ──────────────────────────────────────────────────────────
  const renderPast = () => {
    if (pastLoading) {
      return <ActivityIndicator color="#7B61FF" style={{ marginTop: 40 }} />;
    }
    if (past.length === 0) return <EmptyState tab="past" />;
    return (
      <FlatList
        data={past}
        keyExtractor={b => b.id}
        contentContainerStyle={S.list}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMorePast}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl refreshing={pastRefreshing} onRefresh={handleTabRefresh} tintColor="#7B61FF" />
        }
        ListFooterComponent={
          pastLoadingMore
            ? <ActivityIndicator color="#7B61FF" style={{ marginVertical: 16 }} />
            : null
        }
        renderItem={({ item }) => (
          <PastBookingCard
            booking={item}
            onPress={() => navigateToDetail(item.id)}
            onReview={() => navigateToReview(item)}
          />
        )}
      />
    );
  };

  return (
    <View style={S.root}>
      {/* Header */}
      <View style={S.header}>
        <Text style={S.headerTitle}>Мои записи</Text>
      </View>

      {/* Tabs */}
      <View style={S.tabsRow}>
        {([
          { key: 'upcoming', label: 'Предстоящие' },
          { key: 'past',     label: 'Прошедшие'   },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <Pressable
            key={key}
            style={[S.tabBtn, tab === key && S.tabBtnActive]}
            onPress={() => setTab(key)}
          >
            <Text style={[S.tabText, tab === key && S.tabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {tab === 'upcoming' ? renderUpcoming() : renderPast()}
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F7FF' },

  header: {
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1A1628' },

  tabsRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingHorizontal: 20, paddingBottom: 14, gap: 8,
    borderBottomWidth: 1, borderBottomColor: '#F0EDF8',
  },
  tabBtn: {
    paddingHorizontal: 20, paddingVertical: 9,
    borderRadius: 999, backgroundColor: '#F0EDF8',
  },
  tabBtnActive: { backgroundColor: '#1A1628' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#7A7286' },
  tabTextActive: { color: '#fff' },

  list: { padding: 16, gap: 10, paddingBottom: 32 },

  // Card
  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#fff', borderRadius: 18, padding: 14, gap: 12,
  },
  avatarWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#EDE8FF', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitials: { fontSize: 16, fontWeight: '700', color: '#7B61FF' },
  cardBody: { flex: 1, gap: 4 },

  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardMaster: { fontSize: 15, fontWeight: '700', color: '#1A1628', flex: 1 },

  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  statusText: { fontSize: 11, fontWeight: '700' },

  cardService: { fontSize: 13, color: '#7A7286' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: '#9CA3AF', flex: 1 },
  cardPrice: { fontSize: 13, fontWeight: '700', color: '#1A1628' },

  reviewCTA: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 6, paddingVertical: 7, paddingHorizontal: 12,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#7B61FF',
    alignSelf: 'flex-start',
  },
  reviewCTAText: { fontSize: 12, fontWeight: '700', color: '#7B61FF' },

  // Empty
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#1A1628', textAlign: 'center' },
  emptySub: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    paddingHorizontal: 28, paddingVertical: 12,
    borderRadius: 999, backgroundColor: '#7B61FF', marginTop: 8,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
