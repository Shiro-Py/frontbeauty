import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Keyboard, KeyboardAvoidingView, Modal,
  Platform, Pressable, ScrollView, StyleSheet, Text,
  TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Category } from '@ayla/shared';

const SCREEN_H = Dimensions.get('window').height;

export interface CatalogFilters {
  category: string;
  price_min: string;
  price_max: string;
  rating_min: number;
  distance_km: number;
  date: string;
  time_of_day: '' | 'morning' | 'afternoon' | 'evening';
}

export const DEFAULT_FILTERS: CatalogFilters = {
  category: '', price_min: '', price_max: '',
  rating_min: 0, distance_km: 0, date: '', time_of_day: '',
};

export function countActiveFilters(f: CatalogFilters): number {
  let n = 0;
  if (f.category) n++;
  if (f.price_min || f.price_max) n++;
  if (f.rating_min) n++;
  if (f.distance_km) n++;
  if (f.date || f.time_of_day) n++;
  return n;
}

function todayIso() { return new Date().toISOString().split('T')[0]; }
function tomorrowIso() {
  const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0];
}
function thisWeekEndIso() {
  const d = new Date();
  const dw = d.getDay(); // 0=Sun
  const toSun = dw === 0 ? 6 : 7 - dw;
  d.setDate(d.getDate() + toSun);
  return d.toISOString().split('T')[0];
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────

const CAL_MONTHS = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь',
];
const CAL_DAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

function MiniCalendar({ selected, onSelect }: {
  selected: string;
  onSelect: (iso: string) => void;
}) {
  const now = new Date();
  const [viewY, setViewY] = useState(now.getFullYear());
  const [viewM, setViewM] = useState(now.getMonth());
  const todayStr = todayIso();

  const firstDow = new Date(viewY, viewM, 1).getDay();
  const firstMon = (firstDow + 6) % 7;
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();

  const cells: (number | null)[] = Array(firstMon).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  function isoForDay(d: number) {
    return `${viewY}-${String(viewM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function prevMonth() {
    if (viewM === 0) { setViewM(11); setViewY(y => y - 1); } else setViewM(m => m - 1);
  }
  function nextMonth() {
    if (viewM === 11) { setViewM(0); setViewY(y => y + 1); } else setViewM(m => m + 1);
  }

  return (
    <View style={C.root}>
      <View style={C.header}>
        <Pressable style={C.navBtn} onPress={prevMonth}>
          <Ionicons name="chevron-back" size={18} color="#1A1A1A" />
        </Pressable>
        <Text style={C.monthLabel}>{CAL_MONTHS[viewM]} {viewY}</Text>
        <Pressable style={C.navBtn} onPress={nextMonth}>
          <Ionicons name="chevron-forward" size={18} color="#1A1A1A" />
        </Pressable>
      </View>

      <View style={C.weekRow}>
        {CAL_DAYS.map(d => <Text key={d} style={C.weekDay}>{d}</Text>)}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={C.weekRow}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={C.dayCell} />;
            const iso = isoForDay(day);
            const past = iso < todayStr;
            const sel = iso === selected;
            const isToday = iso === todayStr;
            return (
              <Pressable
                key={di}
                style={[C.dayCell, sel && C.dayCellSel, isToday && !sel && C.dayCellToday]}
                onPress={() => !past && onSelect(iso)}
                disabled={past}
              >
                <Text style={[
                  C.dayText,
                  past && C.dayTextPast,
                  sel && C.dayTextSel,
                  isToday && !sel && C.dayTextToday,
                ]}>
                  {day}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const C = StyleSheet.create({
  root: { marginTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  navBtn: { padding: 6 },
  monthLabel: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  weekRow: { flexDirection: 'row', marginBottom: 2 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#9CA3AF', paddingVertical: 4 },
  dayCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  dayCellSel: { backgroundColor: '#7B61FF' },
  dayCellToday: { borderWidth: 1.5, borderColor: '#7B61FF' },
  dayText: { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
  dayTextPast: { color: '#D1D5DB' },
  dayTextSel: { color: '#fff', fontWeight: '700' },
  dayTextToday: { color: '#7B61FF', fontWeight: '700' },
});

// ─── Section header ───────────────────────────────────────────────────────────

function SectionTitle({ title }: { title: string }) {
  return <Text style={F.sectionTitle}>{title}</Text>;
}

// ─── Filter Sheet ─────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  categories: Category[];
  initialFilters: CatalogFilters;
  onApply: (filters: CatalogFilters) => void;
  onClose: () => void;
}

export default function FilterSheet({ visible, categories, initialFilters, onApply, onClose }: Props) {
  const anim = useRef(new Animated.Value(SCREEN_H)).current;
  const [draft, setDraft] = useState<CatalogFilters>(initialFilters);
  const [calOpen, setCalOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraft(initialFilters);
      setCalOpen(false);
      Animated.spring(anim, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
    } else {
      Animated.timing(anim, { toValue: SCREEN_H, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  function set<K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) {
    setDraft(prev => ({ ...prev, [key]: value }));
  }

  function handleDatePreset(iso: string) {
    set('date', draft.date === iso ? '' : iso);
    setCalOpen(false);
  }

  function handleReset() {
    setDraft(DEFAULT_FILTERS);
    setCalOpen(false);
  }

  function handleApply() {
    Keyboard.dismiss();
    onApply(draft);
  }

  const DISTANCE_OPTIONS: { label: string; value: number }[] = [
    { label: 'Любое', value: 0 },
    { label: '< 1 км', value: 1 },
    { label: '< 3 км', value: 3 },
    { label: '< 5 км', value: 5 },
    { label: '< 10 км', value: 10 },
  ];

  const TIME_OPTIONS: { label: string; value: CatalogFilters['time_of_day'] }[] = [
    { label: 'Любое', value: '' },
    { label: '☀️ Утро 9–12', value: 'morning' },
    { label: '🌤 День 12–17', value: 'afternoon' },
    { label: '🌆 Вечер 17–21', value: 'evening' },
  ];

  const todayStr = todayIso();
  const tomorrowStr = tomorrowIso();
  const weekStr = thisWeekEndIso();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={F.overlay} onPress={onClose} />
        <Animated.View style={[F.sheet, { transform: [{ translateY: anim }] }]}>
          {/* Header */}
          <View style={F.sheetHandle} />
          <View style={F.sheetHeader}>
            <Pressable onPress={handleReset}>
              <Text style={F.resetText}>Сбросить</Text>
            </Pressable>
            <Text style={F.sheetTitle}>Фильтры</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={F.scrollContent}
          >
            {/* ── Категория ── */}
            <SectionTitle title="Категория" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={F.chipScroll} contentContainerStyle={F.chipRow}>
              <Pressable
                style={[F.chip, draft.category === '' && F.chipActive]}
                onPress={() => set('category', '')}
              >
                <Text style={[F.chipText, draft.category === '' && F.chipTextActive]}>Все</Text>
              </Pressable>
              {categories.map(cat => (
                <Pressable
                  key={cat.id}
                  style={[F.chip, draft.category === cat.id && F.chipActive]}
                  onPress={() => set('category', draft.category === cat.id ? '' : cat.id)}
                >
                  {cat.icon ? <Text style={F.chipIcon}>{cat.icon}</Text> : null}
                  <Text style={[F.chipText, draft.category === cat.id && F.chipTextActive]}>{cat.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* ── Цена ── */}
            <SectionTitle title="Цена (₽)" />
            <View style={F.priceRow}>
              <View style={F.priceInputWrap}>
                <Text style={F.priceLabel}>От</Text>
                <TextInput
                  style={F.priceInput}
                  value={draft.price_min}
                  onChangeText={v => set('price_min', v.replace(/\D/g, ''))}
                  placeholder="0"
                  placeholderTextColor="#C4B5FD"
                  keyboardType="numeric"
                />
              </View>
              <View style={F.priceDash} />
              <View style={F.priceInputWrap}>
                <Text style={F.priceLabel}>До</Text>
                <TextInput
                  style={F.priceInput}
                  value={draft.price_max}
                  onChangeText={v => set('price_max', v.replace(/\D/g, ''))}
                  placeholder="∞"
                  placeholderTextColor="#C4B5FD"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* ── Рейтинг ── */}
            <SectionTitle title="Минимальный рейтинг" />
            <View style={F.starRow}>
              {[1, 2, 3, 4, 5].map(star => {
                const active = draft.rating_min >= star;
                return (
                  <Pressable
                    key={star}
                    onPress={() => set('rating_min', draft.rating_min === star ? 0 : star)}
                    hitSlop={6}
                  >
                    <Ionicons
                      name={active ? 'star' : 'star-outline'}
                      size={32}
                      color={active ? '#F59E0B' : '#D1D5DB'}
                    />
                  </Pressable>
                );
              })}
              {draft.rating_min > 0 && (
                <Text style={F.ratingLabel}>от {draft.rating_min}★</Text>
              )}
            </View>

            {/* ── Расстояние ── */}
            <SectionTitle title="Расстояние" />
            <View style={F.chipRow}>
              {DISTANCE_OPTIONS.map(opt => (
                <Pressable
                  key={opt.value}
                  style={[F.chip, draft.distance_km === opt.value && F.chipActive]}
                  onPress={() => set('distance_km', opt.value)}
                >
                  <Text style={[F.chipText, draft.distance_km === opt.value && F.chipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* ── Дата ── */}
            <SectionTitle title="Дата" />
            <View style={F.chipRow}>
              {[
                { label: 'Сегодня', iso: todayStr },
                { label: 'Завтра', iso: tomorrowStr },
                { label: 'Эта неделя', iso: weekStr },
              ].map(({ label, iso }) => (
                <Pressable
                  key={iso}
                  style={[F.chip, draft.date === iso && F.chipActive]}
                  onPress={() => handleDatePreset(iso)}
                >
                  <Text style={[F.chipText, draft.date === iso && F.chipTextActive]}>{label}</Text>
                </Pressable>
              ))}
              <Pressable
                style={[F.chip, calOpen && F.chipActive]}
                onPress={() => setCalOpen(o => !o)}
              >
                <Ionicons name="calendar-outline" size={14} color={calOpen ? '#fff' : '#7B61FF'} />
                <Text style={[F.chipText, calOpen && F.chipTextActive]}>Дата</Text>
              </Pressable>
            </View>
            {calOpen && (
              <MiniCalendar
                selected={draft.date}
                onSelect={iso => { set('date', iso); setCalOpen(false); }}
              />
            )}

            {/* ── Время суток ── */}
            <SectionTitle title="Время суток" />
            <View style={F.chipRow}>
              {TIME_OPTIONS.map(opt => (
                <Pressable
                  key={opt.value}
                  style={[F.chip, draft.time_of_day === opt.value && F.chipActive]}
                  onPress={() => set('time_of_day', opt.value)}
                >
                  <Text style={[F.chipText, draft.time_of_day === opt.value && F.chipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Apply button */}
          <View style={F.bottomBar}>
            <Pressable style={F.applyBtn} onPress={handleApply}>
              <Text style={F.applyBtnText}>Применить</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const F = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: SCREEN_H * 0.88,
    paddingTop: 12,
  },
  sheetHandle: {
    alignSelf: 'center', width: 40, height: 4,
    borderRadius: 2, backgroundColor: '#E5E5E5', marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 16,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  resetText: { fontSize: 14, color: '#7B61FF', fontWeight: '600' },

  scrollContent: { paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#7A7286',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: 20, marginBottom: 10,
  },

  // Category chips
  chipScroll: { marginHorizontal: -20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E5E5',
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#7B61FF', borderColor: '#7B61FF' },
  chipIcon: { fontSize: 13 },
  chipText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  chipTextActive: { color: '#fff' },

  // Price
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priceInputWrap: {
    flex: 1, borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: 12,
    paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10,
    backgroundColor: '#FAFAFA',
  },
  priceLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 2, fontWeight: '500' },
  priceInput: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', padding: 0 },
  priceDash: { width: 12, height: 2, backgroundColor: '#D1D5DB', borderRadius: 1 },

  // Stars
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingLabel: { fontSize: 13, color: '#7B61FF', fontWeight: '700', marginLeft: 4 },

  // Bottom
  bottomBar: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  applyBtn: {
    height: 52, borderRadius: 999, backgroundColor: '#7B61FF',
    alignItems: 'center', justifyContent: 'center',
  },
  applyBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
