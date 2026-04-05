import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createBooking } from '@beautygo/shared';

const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  return `${days[date.getDay()]}, ${d} ${MONTHS_RU[m - 1]} ${y}`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h}ч ${m}м`;
}

export default function BookingSummaryScreen() {
  const params = useLocalSearchParams<{
    specialist_id: string;
    specialist_name: string;
    service_id: string;
    service_name: string;
    service_price: string;
    service_duration: string;
    slot_id: string;
    date: string;
    time: string;
  }>();

  const [loading, setLoading] = useState(false);

  const price = Number(params.service_price);
  const duration = Number(params.service_duration);

  const handleBook = async () => {
    setLoading(true);
    try {
      const booking = await createBooking(
        {
          specialist_id: params.specialist_id,
          service_id: params.service_id,
          slot_id: params.slot_id,
          date: params.date,
        },
        {
          specialist_name: params.specialist_name,
          service_name: params.service_name,
          service_price: price,
          service_duration: duration,
          time: params.time,
        },
      );
      router.replace({
        pathname: '/booking/confirmation',
        params: {
          booking_id: booking.id,
          specialist_name: params.specialist_name,
          service_name: params.service_name,
          date: params.date,
          time: params.time,
          price: params.service_price,
        },
      } as any);
    } catch {
      Alert.alert('Ошибка', 'Не удалось создать запись. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={S.root}>
      {/* Header */}
      <View style={S.header}>
        <Pressable style={S.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1A1628" />
        </Pressable>
        <Text style={S.headerTitle}>Подтверждение записи</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={S.content}>
        {/* Master */}
        <View style={S.card}>
          <View style={S.cardRow}>
            <View style={S.iconWrap}>
              <Ionicons name="person-outline" size={20} color="#7B61FF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.cardLabel}>Мастер</Text>
              <Text style={S.cardValue}>{params.specialist_name}</Text>
            </View>
          </View>
        </View>

        {/* Service */}
        <View style={S.card}>
          <View style={S.cardRow}>
            <View style={S.iconWrap}>
              <Ionicons name="cut-outline" size={20} color="#7B61FF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.cardLabel}>Услуга</Text>
              <Text style={S.cardValue}>{params.service_name}</Text>
              <Text style={S.cardSub}>{formatDuration(duration)}</Text>
            </View>
          </View>
        </View>

        {/* Date & time */}
        <View style={S.card}>
          <View style={S.cardRow}>
            <View style={S.iconWrap}>
              <Ionicons name="calendar-outline" size={20} color="#7B61FF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.cardLabel}>Дата и время</Text>
              <Text style={S.cardValue}>{formatDate(params.date)}</Text>
              <Text style={S.cardSub}>{params.time}</Text>
            </View>
          </View>
        </View>

        {/* Price */}
        <View style={[S.card, S.priceCard]}>
          <Text style={S.priceLabel}>Итого к оплате</Text>
          <Text style={S.priceValue}>{price.toLocaleString('ru-RU')} ₽</Text>
        </View>

        <Text style={S.disclaimer}>
          Бесплатная отмена за 2 часа до записи. После — удерживается 50% стоимости.
        </Text>
      </View>

      {/* Bottom button */}
      <View style={S.bottomBar}>
        <Pressable style={[S.btn, loading && S.btnLoading]} onPress={handleBook} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={S.btnText}>Записаться · {price.toLocaleString('ru-RU')} ₽</Text>
          }
        </Pressable>
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F7FF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F0EDF8',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F0EDF8', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1628' },

  content: { flex: 1, padding: 16 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#EDE8FF', alignItems: 'center', justifyContent: 'center',
  },
  cardLabel: { fontSize: 12, color: '#7A7286', marginBottom: 3 },
  cardValue: { fontSize: 16, fontWeight: '600', color: '#1A1628' },
  cardSub: { fontSize: 13, color: '#7A7286', marginTop: 2 },

  priceCard: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 6,
  },
  priceLabel: { fontSize: 15, fontWeight: '600', color: '#1A1628' },
  priceValue: { fontSize: 22, fontWeight: '800', color: '#7B61FF' },

  disclaimer: { fontSize: 12, color: '#9CA3AF', lineHeight: 17, marginTop: 12, textAlign: 'center' },

  bottomBar: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12, backgroundColor: '#fff' },
  btn: {
    height: 52, borderRadius: 999, backgroundColor: '#7B61FF',
    alignItems: 'center', justifyContent: 'center',
  },
  btnLoading: { opacity: 0.7 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
