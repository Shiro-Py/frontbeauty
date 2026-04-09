import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, FlatList,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSlots } from '@beautygo/shared';

const DAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS_RU = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function buildDays(): { label: string; sub: string; iso: string }[] {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      label: i === 0 ? 'Сегодня' : DAYS_RU[d.getDay()],
      sub: `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`,
      iso: d.toISOString().split('T')[0],
    });
  }
  return days;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h}ч ${m}м`;
}

const DAYS = buildDays();

export default function SlotPickerScreen() {
  const params = useLocalSearchParams<{
    specialist_id: string;
    specialist_name: string;
    service_id: string;
    service_name: string;
    service_price: string;
    service_duration: string;
  }>();

  const [selectedDay, setSelectedDay] = useState(DAYS[0].iso);
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const loadSlots = useCallback(async (date: string) => {
    setLoading(true);
    setSelectedSlot(null);
    try {
      const data = await getSlots(params.specialist_id, params.service_id, date);
      setSlots(data);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [params.specialist_id, params.service_id]);

  useEffect(() => { loadSlots(selectedDay); }, [selectedDay, loadSlots]);

  const handleContinue = () => {
    if (!selectedSlot) return;
    router.push({
      pathname: '/booking/summary',
      params: {
        specialist_id: params.specialist_id,
        specialist_name: params.specialist_name,
        service_id: params.service_id,
        service_name: params.service_name,
        service_price: params.service_price,
        service_duration: params.service_duration,
        date: selectedDay,
        time: selectedSlot,
      },
    } as any);
  };

  const price = Number(params.service_price);
  const duration = Number(params.service_duration);

  return (
    <View testID="slots-screen" style={S.root}>
      {/* Header */}
      <View style={S.header}>
        <Pressable style={S.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1A1628" />
        </Pressable>
        <Text style={S.headerTitle}>Выберите время</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Service card */}
      <View style={S.serviceCard}>
        <View style={{ flex: 1 }}>
          <Text style={S.serviceName}>{params.service_name}</Text>
          <Text style={S.serviceMeta}>{formatDuration(duration)} · {price.toLocaleString('ru-RU')} ₽</Text>
        </View>
        <Text style={S.masterName}>{params.specialist_name}</Text>
      </View>

      {/* Day picker */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={S.dayRow}
        style={S.dayScroll}
      >
        {DAYS.map(day => {
          const active = day.iso === selectedDay;
          return (
            <Pressable
              key={day.iso}
              style={[S.dayBtn, active && S.dayBtnActive]}
              onPress={() => setSelectedDay(day.iso)}
            >
              <Text style={[S.dayLabel, active && S.dayLabelActive]}>{day.label}</Text>
              <Text style={[S.daySub, active && S.daySubActive]}>{day.sub}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Slots grid */}
      <View style={S.slotsWrap}>
        {loading ? (
          <View style={S.loadingWrap}>
            <ActivityIndicator color="#7B61FF" />
          </View>
        ) : slots.length === 0 ? (
          <View style={S.emptyWrap}>
            <Text style={S.emptyText}>Нет доступных слотов</Text>
          </View>
        ) : (
          <FlatList
            data={slots}
            keyExtractor={time => time}
            numColumns={4}
            columnWrapperStyle={S.slotRow}
            contentContainerStyle={S.slotList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: time, index }) => {
              const isSelected = selectedSlot === time;
              return (
                <Pressable
                  testID={`slot-item-${index}`}
                  style={[S.slotBtn, isSelected && S.slotBtnSelected]}
                  onPress={() => setSelectedSlot(time)}
                >
                  <Text style={[S.slotTime, isSelected && S.slotTimeSelected]}>
                    {time}
                  </Text>
                </Pressable>
              );
            }}
          />
        )}
      </View>

      {/* Continue button */}
      <View style={S.bottomBar}>
        <Pressable
          testID="slots-next-btn"
          style={[S.btn, !selectedSlot && S.btnDisabled]}
          onPress={handleContinue}
          disabled={!selectedSlot}
        >
          <Text style={[S.btnText, !selectedSlot && S.btnTextDisabled]}>
            {selectedSlot ? `Продолжить · ${selectedSlot}` : 'Выберите время'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F0EDF8', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1628' },

  serviceCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#F8F7FF', borderRadius: 14, padding: 14,
  },
  serviceName: { fontSize: 15, fontWeight: '600', color: '#1A1628', marginBottom: 3 },
  serviceMeta: { fontSize: 13, color: '#7A7286' },
  masterName: { fontSize: 13, color: '#7B61FF', fontWeight: '600', textAlign: 'right', maxWidth: 100 },

  dayScroll: { flexGrow: 0 },
  dayRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 16 },
  dayBtn: {
    alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E5E5', minWidth: 72,
  },
  dayBtnActive: { backgroundColor: '#7B61FF', borderColor: '#7B61FF' },
  dayLabel: { fontSize: 13, fontWeight: '600', color: '#1A1628', marginBottom: 2 },
  dayLabelActive: { color: '#fff' },
  daySub: { fontSize: 12, color: '#7A7286' },
  daySubActive: { color: 'rgba(255,255,255,0.8)' },

  slotsWrap: { flex: 1, paddingHorizontal: 16 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, color: '#7A7286' },

  slotList: { paddingBottom: 16 },
  slotRow: { gap: 8, marginBottom: 8 },
  slotBtn: {
    flex: 1, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#E5E5E5', backgroundColor: '#fff',
  },
  slotBtnBusy: { backgroundColor: '#F5F5F5', borderColor: '#F0EDF8' },
  slotBtnSelected: { backgroundColor: '#7B61FF', borderColor: '#7B61FF' },
  slotTime: { fontSize: 14, fontWeight: '600', color: '#1A1628' },
  slotTimeBusy: { color: '#C8C2E8', textDecorationLine: 'line-through' },
  slotTimeSelected: { color: '#fff' },

  bottomBar: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12 },
  btn: {
    height: 52, borderRadius: 999, backgroundColor: '#7B61FF',
    alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { backgroundColor: '#E5E5E5' },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  btnTextDisabled: { color: '#9CA3AF' },
});
