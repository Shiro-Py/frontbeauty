import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS_RU[m - 1]} ${y}`;
}

export default function BookingConfirmationScreen() {
  const params = useLocalSearchParams<{
    booking_id: string;
    specialist_name: string;
    service_name: string;
    date: string;
    time: string;
    price: string;
  }>();

  return (
    <View testID="confirmation-screen" style={S.root}>
      <View style={S.body}>
        {/* Success icon */}
        <View style={S.checkCircle}>
          <Ionicons name="checkmark" size={52} color="#fff" />
        </View>

        <Text style={S.title}>Запись подтверждена!</Text>
        <Text style={S.subtitle}>
          Мы напомним вам за час до начала. Хорошего визита!
        </Text>

        {/* Details card */}
        <View style={S.card}>
          <Row icon="person-outline" label="Мастер" value={params.specialist_name} />
          <View style={S.divider} />
          <Row icon="cut-outline" label="Услуга" value={params.service_name} />
          <View style={S.divider} />
          <Row
            icon="calendar-outline"
            label="Дата и время"
            value={`${formatDate(params.date)}, ${params.time}`}
          />
          <View style={S.divider} />
          <Row
            icon="card-outline"
            label="Стоимость"
            value={`${Number(params.price).toLocaleString('ru-RU')} ₽`}
            valueStyle={S.priceText}
          />
        </View>
      </View>

      {/* Buttons */}
      <View style={S.bottomBar}>
        <Pressable
          style={S.primaryBtn}
          onPress={() => router.replace('/(tabs)/booking' as any)}
        >
          <Text style={S.primaryBtnText}>В мои записи</Text>
        </Pressable>
        <Pressable
          style={S.secondaryBtn}
          onPress={() => router.replace('/(tabs)/masters' as any)}
        >
          <Text style={S.secondaryBtnText}>На главную</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Row({
  icon, label, value, valueStyle,
}: {
  icon: any; label: string; value: string; valueStyle?: object;
}) {
  return (
    <View style={S.row}>
      <View style={S.rowIcon}>
        <Ionicons name={icon} size={17} color="#7B61FF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={S.rowLabel}>{label}</Text>
        <Text style={[S.rowValue, valueStyle]}>{value}</Text>
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  body: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24,
  },

  checkCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#22C55E', shadowOpacity: 0.35, shadowRadius: 20, elevation: 8,
  },
  title: {
    fontSize: 24, fontWeight: '800', color: '#1A1628',
    marginBottom: 10, textAlign: 'center',
  },
  subtitle: {
    fontSize: 14, color: '#7A7286', textAlign: 'center',
    lineHeight: 20, marginBottom: 28,
  },

  card: {
    width: '100%', backgroundColor: '#F8F7FF',
    borderRadius: 18, padding: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  rowIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#EDE8FF', alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { fontSize: 12, color: '#7A7286', marginBottom: 2 },
  rowValue: { fontSize: 15, fontWeight: '600', color: '#1A1628' },
  priceText: { color: '#7B61FF', fontWeight: '700', fontSize: 16 },
  divider: { height: 1, backgroundColor: '#EDE8FF', marginHorizontal: 12 },

  bottomBar: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  primaryBtn: {
    height: 52, borderRadius: 999, backgroundColor: '#7B61FF',
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  secondaryBtn: {
    height: 48, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 15, color: '#7A7286', fontWeight: '500' },
});
