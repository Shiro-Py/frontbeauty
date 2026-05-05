import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDiary, deleteLog, DiarySummary, DiaryEntry, NutrientData } from '@ayla/shared';

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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function FoodScreen() {
  const router = useRouter();
  const [date, setDate] = useState(todayIso());
  const [summary, setSummary] = useState<DiarySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await getDiary(date);
      setSummary(data);
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
