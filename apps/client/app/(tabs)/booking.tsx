import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, FlatList,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getBookings, Booking, BookingStatus } from '@beautygo/shared';

const MONTHS_RU = [
  'янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
];

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS_RU[m - 1]} ${y}`;
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending:   'Ожидает',
  confirmed: 'Подтверждена',
  completed: 'Завершена',
  cancelled: 'Отменена',
};

const STATUS_COLOR: Record<BookingStatus, string> = {
  pending:   '#F59E0B',
  confirmed: '#22C55E',
  completed: '#7B61FF',
  cancelled: '#EF4444',
};

type Tab = 'upcoming' | 'past';

function isUpcoming(b: Booking): boolean {
  return b.status === 'pending' || b.status === 'confirmed';
}

function BookingCard({ booking, onPress }: { booking: Booking; onPress: () => void }) {
  return (
    <Pressable style={S.card} onPress={onPress}>
      {/* Avatar placeholder */}
      <View style={S.avatarWrap}>
        <Text style={S.avatarInitials}>
          {booking.specialist_name.split(' ').map(w => w[0]).slice(0, 2).join('')}
        </Text>
      </View>

      <View style={S.cardBody}>
        <Text style={S.cardMaster}>{booking.specialist_name}</Text>
        <Text style={S.cardService}>{booking.service_name}</Text>
        <View style={S.cardMeta}>
          <Ionicons name="calendar-outline" size={13} color="#7A7286" />
          <Text style={S.cardMetaText}>{formatDate(booking.date)} · {booking.time}</Text>
        </View>
      </View>

      <View style={S.cardRight}>
        <View style={[S.statusBadge, { backgroundColor: STATUS_COLOR[booking.status] + '18' }]}>
          <Text style={[S.statusText, { color: STATUS_COLOR[booking.status] }]}>
            {STATUS_LABEL[booking.status]}
          </Text>
        </View>
        <Text style={S.cardPrice}>{booking.service_price.toLocaleString('ru-RU')} ₽</Text>
      </View>
    </Pressable>
  );
}

export default function MyBookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('upcoming');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getBookings();
      setBookings(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(true); };

  const shown = bookings.filter(b => tab === 'upcoming' ? isUpcoming(b) : !isUpcoming(b));

  if (loading) {
    return (
      <View style={S.centered}>
        <ActivityIndicator color="#7B61FF" size="large" />
      </View>
    );
  }

  return (
    <View style={S.root}>
      {/* Header */}
      <View style={S.header}>
        <Text style={S.headerTitle}>Мои записи</Text>
      </View>

      {/* Tabs */}
      <View style={S.tabs}>
        {(['upcoming', 'past'] as Tab[]).map(t => (
          <Pressable
            key={t}
            style={[S.tabBtn, tab === t && S.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[S.tabText, tab === t && S.tabTextActive]}>
              {t === 'upcoming' ? 'Предстоящие' : 'История'}
            </Text>
          </Pressable>
        ))}
      </View>

      {shown.length === 0 ? (
        <View style={S.empty}>
          <Ionicons name="calendar-outline" size={48} color="#C8C2E8" />
          <Text style={S.emptyTitle}>
            {tab === 'upcoming' ? 'Нет предстоящих записей' : 'История пуста'}
          </Text>
          {tab === 'upcoming' && (
            <Pressable style={S.emptyBtn} onPress={() => router.push('/(tabs)/masters' as any)}>
              <Text style={S.emptyBtnText}>Найти мастера</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={b => b.id}
          contentContainerStyle={S.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7B61FF" />}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() => router.push({ pathname: '/booking/[id]', params: { id: item.id } } as any)}
            />
          )}
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F7FF' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1A1628' },

  tabs: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingHorizontal: 20, paddingBottom: 12, gap: 8,
    borderBottomWidth: 1, borderBottomColor: '#F0EDF8',
  },
  tabBtn: {
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 999, backgroundColor: '#F0EDF8',
  },
  tabBtnActive: { backgroundColor: '#7B61FF' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#7A7286' },
  tabTextActive: { color: '#fff' },

  list: { padding: 16, gap: 10 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 12,
  },
  avatarWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#EDE8FF', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: 16, fontWeight: '700', color: '#7B61FF' },
  cardBody: { flex: 1 },
  cardMaster: { fontSize: 15, fontWeight: '700', color: '#1A1628', marginBottom: 2 },
  cardService: { fontSize: 13, color: '#7A7286', marginBottom: 5 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText: { fontSize: 12, color: '#7A7286' },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardPrice: { fontSize: 14, fontWeight: '700', color: '#1A1628' },

  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  emptyTitle: { fontSize: 16, color: '#7A7286', fontWeight: '500' },
  emptyBtn: {
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 999, backgroundColor: '#7B61FF', marginTop: 4,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
