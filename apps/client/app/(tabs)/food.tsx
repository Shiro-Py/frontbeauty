import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, RefreshControl, Alert, Animated,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDiary, deleteLog, getWater, logWater, DiarySummary, DiaryEntry, NutrientData, WaterData } from '@ayla/shared';

function todayIso() { return new Date().toISOString().split('T')[0]; }
function addDays(iso: string, n: number) {
  const d = new Date(iso); d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}
function formatDate(iso: string): string {
  const today = todayIso();
  const yesterday = addDays(today, -1);
  if (iso === today) return 'Сегодня';
  if (iso === yesterday) return 'Вчера';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}
function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ─── Calorie progress bar ─────────────────────────────────────────────────────

function CalorieCard({ totals, goals }: { totals: NutrientData; goals: NutrientData }) {
  const pct = Math.min(totals.calories / goals.calories, 1);
  const remaining = Math.max(goals.calories - totals.calories, 0);
  const over = totals.calories > goals.calories;

  return (
    <View style={S.calorieCard}>
      <View style={S.calorieHeader}>
        <Text style={S.calorieTitle}>Калории</Text>
        <Text style={S.calorieVal}>
          <Text style={S.calorieNum}>{totals.calories}</Text>
          <Text style={S.calorieGoal}> / {goals.calories} ккал</Text>
        </Text>
      </View>
      <View style={S.progressTrack}>
        <View style={[S.progressFill, { width: `${pct * 100}%` as any, backgroundColor: over ? '#EF4444' : '#7B61FF' }]} />
      </View>
      <Text style={S.calorieRemain}>
        {over
          ? `Превышение: +${totals.calories - goals.calories} ккал`
          : `Осталось: ${remaining} ккал`}
      </Text>
    </View>
  );
}

// ─── BJU row ──────────────────────────────────────────────────────────────────

function BJURow({ totals, goals }: { totals: NutrientData; goals: NutrientData }) {
  const items = [
    { label: 'Белки',    val: totals.protein, goal: goals.protein, color: '#7B61FF' },
    { label: 'Жиры',     val: totals.fat,     goal: goals.fat,     color: '#F59E0B' },
    { label: 'Углеводы', val: totals.carbs,   goal: goals.carbs,   color: '#22C55E' },
  ];
  return (
    <View style={S.bjuRow}>
      {items.map(item => (
        <View key={item.label} style={S.bjuCard}>
          <Text style={S.bjuLabel}>{item.label}</Text>
          <Text style={[S.bjuVal, { color: item.color }]}>{item.val}г</Text>
          <Text style={S.bjuGoal}>из {item.goal}г</Text>
          <View style={S.bjuTrack}>
            <View style={[
              S.bjuFill,
              { width: `${Math.min(item.val / item.goal, 1) * 100}%` as any, backgroundColor: item.color },
            ]} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Diary entry row ──────────────────────────────────────────────────────────

function EntryRow({ item, onDelete }: { item: DiaryEntry; onDelete: () => void }) {
  const handleDelete = () => {
    Alert.alert('Удалить блюдо?', item.food_name, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <View style={S.entryRow}>
      <View style={S.entryIconBox}>
        <Ionicons name="fast-food-outline" size={20} color="#7B61FF" />
      </View>
      <View style={S.entryInfo}>
        <Text style={S.entryName} numberOfLines={1}>{item.food_name}</Text>
        <Text style={S.entryMeta}>
          {item.calories} ккал · Б {item.protein}г · Ж {item.fat}г · У {item.carbs}г
        </Text>
        <Text style={S.entryTime}>{formatTime(item.logged_at)}</Text>
      </View>
      <Pressable onPress={handleDelete} hitSlop={12} style={S.entryDelete}>
        <Ionicons name="trash-outline" size={18} color="#D1D5DB" />
      </Pressable>
    </View>
  );
}

// ─── Water block ──────────────────────────────────────────────────────────────

const WATER_PORTIONS = [200, 350, 500];

function WaterBlock({ water, onAdd, onUndo }: {
  water: WaterData;
  onAdd: (ml: number) => void;
  onUndo: () => void;
}) {
  const pct = Math.min(water.water_ml / water.goal_ml, 1);
  const done = water.water_ml >= water.goal_ml;
  const glasses = Math.round(water.water_ml / 200);
  const goalGlasses = Math.round(water.goal_ml / 200);

  const animWidth = useRef(new Animated.Value(pct)).current;

  useEffect(() => {
    Animated.timing(animWidth, {
      toValue: pct,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const barColor = done ? '#7B61FF' : '#38BDF8';

  return (
    <View style={SW.block}>
      <View style={SW.header}>
        <View style={SW.titleRow}>
          <Text style={SW.dropIcon}>💧</Text>
          <Text style={SW.title}>Вода</Text>
          {done && <Ionicons name="checkmark-circle" size={16} color="#7B61FF" style={{ marginLeft: 4 }} />}
        </View>
        <Text style={SW.counter}>
          {water.water_ml} / {water.goal_ml} мл
          <Text style={SW.glasses}>  ({glasses}/{goalGlasses} ст.)</Text>
        </Text>
      </View>

      {/* Progress bar */}
      <View style={SW.track}>
        <Animated.View style={[
          SW.fill,
          {
            width: animWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            backgroundColor: barColor,
          },
        ]} />
      </View>

      {done
        ? <Text style={SW.doneText}>Норма выполнена 🎉</Text>
        : water.water_ml === 0
          ? <Text style={SW.emptyText}>Выпей первый стакан воды</Text>
          : null}

      {/* Buttons */}
      <View style={SW.btnRow}>
        {WATER_PORTIONS.map(ml => (
          <Pressable key={ml} style={SW.addBtn} onPress={() => onAdd(ml)}>
            <Text style={SW.addBtnText}>+{ml}мл</Text>
          </Pressable>
        ))}
        <Pressable
          style={[SW.addBtn, SW.undoBtn]}
          onPress={onUndo}
          disabled={water.water_ml === 0}
        >
          <Ionicons name="remove" size={16} color={water.water_ml === 0 ? '#D1D5DB' : '#EF4444'} />
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function FoodScreen() {
  const router = useRouter();
  const [date, setDate] = useState(todayIso());
  const [summary, setSummary] = useState<DiarySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [water, setWater] = useState<WaterData>({ water_ml: 0, goal_ml: 2000 });

  const handleAddWater = async (ml: number) => {
    const prev = water;
    setWater(w => ({ ...w, water_ml: w.water_ml + ml }));
    try {
      const updated = await logWater(ml);
      setWater(updated);
    } catch {
      setWater(prev);
    }
  };

  const handleUndoWater = async () => {
    if (water.water_ml === 0) return;
    const prev = water;
    const undoMl = -200;
    setWater(w => ({ ...w, water_ml: Math.max(0, w.water_ml + undoMl) }));
    try {
      const updated = await logWater(undoMl);
      setWater(updated);
    } catch {
      setWater(prev);
    }
  };

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [data, waterData] = await Promise.all([getDiary(date), getWater(date)]);
      setSummary(data);
      setWater(waterData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => { setLoading(true); load(); }, [date]);

  const handleDelete = async (id: string) => {
    setSummary(prev => {
      if (!prev) return prev;
      const entries = prev.entries.filter(e => e.id !== id);
      const totals = entries.reduce(
        (acc, e) => ({ calories: acc.calories + e.calories, protein: acc.protein + e.protein, fat: acc.fat + e.fat, carbs: acc.carbs + e.carbs }),
        { calories: 0, protein: 0, fat: 0, carbs: 0 },
      );
      return { ...prev, entries, totals };
    });
    try { await deleteLog(id); } catch { load(); }
  };

  if (loading) {
    return (
      <View style={[S.root, S.center]}>
        <ActivityIndicator color="#7B61FF" size="large" />
      </View>
    );
  }

  const s = summary!;

  return (
    <View style={S.root}>
      <FlatList
        data={s.entries}
        keyExtractor={e => e.id}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#7B61FF" />}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={S.header}>
              <Text style={S.screenTitle}>Питание</Text>
              <Pressable onPress={() => router.push('/food/insights' as any)}>
                <Text style={S.insightsLink}>Чего не хватает</Text>
              </Pressable>
            </View>

            {/* Date nav */}
            <View style={S.dateNav}>
              <Pressable
                onPress={() => setDate(d => addDays(d, -1))}
                hitSlop={12}
                style={S.dateArrow}
              >
                <Ionicons name="chevron-back" size={20} color="#1A1A1A" />
              </Pressable>
              <Text style={S.dateLabel}>{formatDate(date)}</Text>
              <Pressable
                onPress={() => { if (date < todayIso()) setDate(d => addDays(d, 1)); }}
                hitSlop={12}
                style={[S.dateArrow, date >= todayIso() && S.dateArrowDisabled]}
              >
                <Ionicons name="chevron-forward" size={20} color={date >= todayIso() ? '#D1D5DB' : '#1A1A1A'} />
              </Pressable>
            </View>

            {/* Calories */}
            <CalorieCard totals={s.totals} goals={s.goals} />

            {/* BJU */}
            <BJURow totals={s.totals} goals={s.goals} />

            {/* Water tracker */}
            <WaterBlock
              water={water}
              onAdd={handleAddWater}
              onUndo={handleUndoWater}
            />

            {/* Section label */}
            <Text style={S.sectionTitle}>Приёмы пищи</Text>
          </>
        }
        ListEmptyComponent={
          <View style={S.emptyState}>
            <Text style={S.emptyIcon}>🍽️</Text>
            <Text style={S.emptyTitle}>Сфотографируй первое блюдо дня</Text>
            <Text style={S.emptySub}>Нажми кнопку камеры ниже</Text>
          </View>
        }
        renderItem={({ item }) => (
          <EntryRow item={item} onDelete={() => handleDelete(item.id)} />
        )}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      {/* Camera FAB */}
      <Pressable
        style={S.cameraFab}
        onPress={() => router.push('/food/scan' as any)}
      >
        <Ionicons name="camera" size={24} color="#fff" />
        <Text style={S.cameraFabText}>Сфотографировать блюдо</Text>
      </Pressable>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  center: { alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8,
  },
  screenTitle: { fontSize: 24, fontWeight: '800', color: '#1A1A1A' },
  insightsLink: { fontSize: 14, fontWeight: '600', color: '#7B61FF' },

  dateNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16,
    paddingVertical: 12,
  },
  dateArrow: { padding: 4 },
  dateArrowDisabled: { opacity: 0.3 },
  dateLabel: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', minWidth: 120, textAlign: 'center' },

  // Calorie card
  calorieCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#F5F2FF', borderRadius: 16, padding: 16,
  },
  calorieHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  calorieTitle: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  calorieVal: {},
  calorieNum: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  calorieGoal: { fontSize: 14, color: '#9CA3AF' },
  progressTrack: { height: 8, backgroundColor: '#E8E0FF', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: 8, borderRadius: 4 },
  calorieRemain: { fontSize: 12, color: '#6B7280' },

  // BJU row
  bjuRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 20 },
  bjuCard: {
    flex: 1, backgroundColor: '#F9F9F9', borderRadius: 12, padding: 12,
  },
  bjuLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  bjuVal: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  bjuGoal: { fontSize: 11, color: '#9CA3AF', marginBottom: 6 },
  bjuTrack: { height: 4, backgroundColor: '#E5E5E5', borderRadius: 2, overflow: 'hidden' },
  bjuFill: { height: 4, borderRadius: 2 },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', paddingHorizontal: 16, marginBottom: 8 },

  // Entry row
  entryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  entryIconBox: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F0EDF8', alignItems: 'center', justifyContent: 'center',
  },
  entryInfo: { flex: 1 },
  entryName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 2 },
  entryMeta: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  entryTime: { fontSize: 11, color: '#9CA3AF' },
  entryDelete: { padding: 4 },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 48, paddingBottom: 24, gap: 8 },
  emptyIcon: { fontSize: 48, marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  emptySub: { fontSize: 14, color: '#9CA3AF' },

  // Camera FAB
  cameraFab: {
    position: 'absolute', bottom: 20, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#7B61FF', borderRadius: 16, paddingVertical: 16,
    shadowColor: '#7B61FF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  cameraFabText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

const SW = StyleSheet.create({
  block: {
    marginHorizontal: 16, marginBottom: 20,
    backgroundColor: '#F0F9FF', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#BAE6FD',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dropIcon: { fontSize: 18 },
  title: { fontSize: 15, fontWeight: '700', color: '#0369A1' },
  counter: { fontSize: 13, fontWeight: '600', color: '#0369A1' },
  glasses: { fontSize: 12, color: '#7DD3FC', fontWeight: '400' },
  track: { height: 8, backgroundColor: '#E0F2FE', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  fill: { height: 8, borderRadius: 4 },
  doneText: { fontSize: 13, color: '#7B61FF', fontWeight: '600', marginBottom: 10 },
  emptyText: { fontSize: 13, color: '#7DD3FC', marginBottom: 10 },
  btnRow: { flexDirection: 'row', gap: 8 },
  addBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#BAE6FD',
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#0369A1' },
  undoBtn: { flex: 0, width: 40, borderColor: '#FECACA' },
});
