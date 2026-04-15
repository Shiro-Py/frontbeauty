import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getBookingById, cancelBooking, Booking, BookingStatus } from '@ayla/shared';

const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS_RU[m - 1]} ${y}`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h}ч ${m}м`;
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending:          'Ожидает подтверждения',
  awaiting_payment: 'Ожидает оплаты',
  confirmed:        'Подтверждена',
  completed:        'Завершена',
  cancelled:        'Отменена',
  no_show:          'Не пришёл',
};

const STATUS_ICON: Record<BookingStatus, any> = {
  pending:          'time-outline',
  awaiting_payment: 'card-outline',
  confirmed:        'checkmark-circle-outline',
  completed:        'checkmark-done-circle-outline',
  cancelled:        'close-circle-outline',
  no_show:          'alert-circle-outline',
};

const STATUS_COLOR: Record<BookingStatus, string> = {
  pending:          '#F59E0B',
  awaiting_payment: '#3B82F6',
  confirmed:        '#22C55E',
  completed:        '#7B61FF',
  cancelled:        '#EF4444',
  no_show:          '#9CA3AF',
};

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={S.infoRow}>
      <View style={S.infoIcon}>
        <Ionicons name={icon} size={18} color="#7B61FF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={S.infoLabel}>{label}</Text>
        <Text style={S.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBookingById(id!);
      setBooking(data);
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить запись');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleCancel = () => {
    Alert.alert(
      'Отменить запись?',
      'Вы уверены, что хотите отменить запись? Это действие нельзя отменить.',
      [
        { text: 'Нет', style: 'cancel' },
        {
          text: 'Отменить запись',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await cancelBooking(id!);
              setBooking(prev => prev ? { ...prev, status: 'cancelled' } : null);
            } catch (e: any) {
              const code = e?.response?.data?.error?.code;
              if (code === 'CANCELLATION_NOT_ALLOWED') {
                Alert.alert('Отмена недоступна', 'Политика отмены не позволяет отменить эту запись');
              } else if (code === 'INVALID_STATUS') {
                Alert.alert('Отмена недоступна', 'Запись уже нельзя отменить в текущем статусе');
              } else {
                Alert.alert('Ошибка', 'Не удалось отменить запись');
              }
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={S.centered}>
        <ActivityIndicator color="#7B61FF" size="large" />
      </View>
    );
  }

  if (!booking) return null;

  const canCancel = booking.status === 'awaiting_payment' || booking.status === 'confirmed';
  const color = STATUS_COLOR[booking.status];

  return (
    <View style={S.root}>
      {/* Header */}
      <View style={S.header}>
        <Pressable style={S.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1A1628" />
        </Pressable>
        <Text style={S.headerTitle}>Детали записи</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={S.content} showsVerticalScrollIndicator={false}>
        {/* Status banner */}
        <View style={[S.statusBanner, { backgroundColor: color + '15' }]}>
          <Ionicons name={STATUS_ICON[booking.status]} size={22} color={color} />
          <Text style={[S.statusText, { color }]}>{STATUS_LABEL[booking.status]}</Text>
        </View>

        {/* Info card */}
        <View style={S.card}>
          <InfoRow icon="person-outline" label="Мастер" value={booking.specialist_name} />
          <View style={S.divider} />
          <InfoRow icon="cut-outline" label="Услуга" value={booking.service_name} />
          <View style={S.divider} />
          <InfoRow
            icon="time-outline"
            label="Длительность"
            value={formatDuration(booking.service_duration)}
          />
          <View style={S.divider} />
          <InfoRow
            icon="calendar-outline"
            label="Дата и время"
            value={`${formatDate(booking.date)}, ${booking.time}`}
          />
          {booking.address && (
            <>
              <View style={S.divider} />
              <InfoRow icon="location-outline" label="Адрес" value={booking.address} />
            </>
          )}
        </View>

        {/* Price card */}
        <View style={[S.card, S.priceCard]}>
          <Text style={S.priceLabel}>Стоимость</Text>
          <Text style={S.priceValue}>{booking.service_price.toLocaleString('ru-RU')} ₽</Text>
        </View>

        {/* Leave review (completed only) */}
        {booking.status === 'completed' && (
          <Pressable
            style={S.reviewBtn}
            onPress={() => router.push({
              pathname: '/review/[id]',
              params: { id: booking.specialist_id, master_name: booking.specialist_name },
            } as any)}
          >
            <Ionicons name="star-outline" size={18} color="#7B61FF" />
            <Text style={S.reviewBtnText}>Оставить отзыв</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Cancel button */}
      {canCancel && (
        <View style={S.bottomBar}>
          <Pressable
            style={[S.cancelBtn, cancelling && S.cancelBtnLoading]}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling
              ? <ActivityIndicator color="#EF4444" />
              : (
                <>
                  <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                  <Text style={S.cancelBtnText}>Отменить запись</Text>
                </>
              )
            }
          </Pressable>
        </View>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F7FF' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0EDF8',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F0EDF8', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1628' },

  content: { padding: 16, gap: 10 },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, padding: 14,
  },
  statusText: { fontSize: 15, fontWeight: '700' },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  infoIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#EDE8FF', alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: { fontSize: 12, color: '#7A7286', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#1A1628' },
  divider: { height: 1, backgroundColor: '#F0EDF8', marginHorizontal: 12 },

  priceCard: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16,
  },
  priceLabel: { fontSize: 15, fontWeight: '600', color: '#1A1628' },
  priceValue: { fontSize: 22, fontWeight: '800', color: '#7B61FF' },

  reviewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#7B61FF',
  },
  reviewBtnText: { fontSize: 15, fontWeight: '600', color: '#7B61FF' },

  bottomBar: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12, backgroundColor: '#fff' },
  cancelBtn: {
    height: 52, borderRadius: 999,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#EF4444',
  },
  cancelBtnLoading: { opacity: 0.5 },
  cancelBtnText: { fontSize: 16, fontWeight: '700', color: '#EF4444' },
});
