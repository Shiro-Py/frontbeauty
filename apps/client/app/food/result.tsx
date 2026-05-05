import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Image,
  Animated, ScrollView, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { scanFood, logFood, FoodScanResult } from '@ayla/shared';

const PORTIONS = [
  { label: '½', value: 0.5 },
  { label: '1×', value: 1.0 },
  { label: '1½', value: 1.5 },
  { label: '2×', value: 2.0 },
];

function calcNutrient(base: number, multiplier: number) {
  return Math.round(base * multiplier * 10) / 10;
}

// ─── Analyzing loader ─────────────────────────────────────────────────────────

function AnalyzingLoader() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -8, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0,  duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ]),
      );
    const a1 = anim(dot1, 0);
    const a2 = anim(dot2, 160);
    const a3 = anim(dot3, 320);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={SL.root}>
      <Text style={SL.emoji}>🔍</Text>
      <Text style={SL.title}>Анализирую блюдо...</Text>
      <Text style={SL.sub}>Это займёт пару секунд</Text>
      <View style={SL.dots}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View key={i} style={[SL.dot, { transform: [{ translateY: dot }] }]} />
        ))}
      </View>
    </View>
  );
}

const SL = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', gap: 12 },
  emoji: { fontSize: 56 },
  title: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  sub: { fontSize: 14, color: '#9CA3AF' },
  dots: { flexDirection: 'row', gap: 8, marginTop: 16 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#7B61FF' },
});

// ─── Result screen ────────────────────────────────────────────────────────────

export default function ResultScreen() {
  const router = useRouter();
  const { imageUri } = useLocalSearchParams<{ imageUri: string }>();

  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState(false);
  const [result, setResult] = useState<FoodScanResult | null>(null);
  const [portion, setPortion] = useState(1.0);
  const [saving, setSaving] = useState(false);
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) setError(true);
    }, 8000);

    scanFood(imageUri ?? '').then(res => {
      clearTimeout(timeout);
      if (!cancelled) { setResult(res); setScanning(false); }
    }).catch(() => {
      clearTimeout(timeout);
      if (!cancelled) { setError(true); setScanning(false); }
    });

    return () => { cancelled = true; clearTimeout(timeout); };
  }, [imageUri]);

  const handleAdd = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await logFood(result.id, portion);
      router.back();
    } catch {
      Alert.alert('Ошибка', 'Не удалось добавить в дневник. Попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  };

  if (scanning) return <AnalyzingLoader />;

  if (error || !result) {
    return (
      <View style={S.errorRoot}>
        <Text style={S.errorEmoji}>😕</Text>
        <Text style={S.errorTitle}>Не смогли распознать</Text>
        <Text style={S.errorSub}>Сделайте фото при хорошем освещении или введите блюдо вручную</Text>
        <Pressable style={S.retryBtn} onPress={() => router.back()}>
          <Text style={S.retryBtnText}>Попробовать ещё раз</Text>
        </Pressable>
      </View>
    );
  }

  const calories = calcNutrient(result.base.calories, portion);
  const protein  = calcNutrient(result.base.protein,  portion);
  const fat      = calcNutrient(result.base.fat,      portion);
  const carbs    = calcNutrient(result.base.carbs,    portion);

  return (
    <ScrollView style={S.root} contentContainerStyle={S.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={S.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
        </Pressable>
        <Text style={S.headerTitle}>Результат</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Photo + name */}
      <View style={S.topRow}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={S.foodThumb} />
        ) : (
          <View style={[S.foodThumb, S.foodThumbPlaceholder]}>
            <Ionicons name="restaurant" size={32} color="#9CA3AF" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={S.foodName}>{result.name}</Text>
          <Text style={S.foodCalories}>{calories} ккал</Text>
        </View>
      </View>

      {/* BJU cards */}
      <View style={S.bjuRow}>
        {[
          { label: 'Белки',    val: protein, color: '#7B61FF' },
          { label: 'Жиры',     val: fat,     color: '#F59E0B' },
          { label: 'Углеводы', val: carbs,   color: '#22C55E' },
        ].map(item => (
          <View key={item.label} style={S.bjuCard}>
            <Text style={[S.bjuVal, { color: item.color }]}>{item.val}г</Text>
            <Text style={S.bjuLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Portion selector */}
      <Text style={S.sectionLabel}>Размер порции</Text>
      <View style={S.portionRow}>
        {PORTIONS.map(p => (
          <Pressable
            key={p.value}
            style={[S.portionBtn, portion === p.value && S.portionBtnActive]}
            onPress={() => setPortion(p.value)}
          >
            <Text style={[S.portionBtnText, portion === p.value && S.portionBtnTextActive]}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Add button */}
      <Pressable
        style={[S.addBtn, saving && S.addBtnDisabled]}
        onPress={handleAdd}
        disabled={saving}
      >
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={S.addBtnText}>{saving ? 'Добавляю...' : 'Добавить в дневник'}</Text>
      </Pressable>

      {/* Not that dish */}
      <Pressable style={S.wrongBtn} onPress={() => setShowManual(v => !v)}>
        <Text style={S.wrongBtnText}>Не то блюдо?</Text>
      </Pressable>

      {showManual && (
        <View style={S.manualHint}>
          <Text style={S.manualHintText}>
            Ручной поиск появится здесь (in progress).{'\n'}
            Пока можно попробовать сфотографировать ещё раз.
          </Text>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  content: { paddingBottom: 40 },

  errorRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, backgroundColor: '#fff' },
  errorEmoji: { fontSize: 56 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  errorSub: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  retryBtn: {
    marginTop: 8, backgroundColor: '#7B61FF',
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14,
  },
  retryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 20,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },

  topRow: {
    flexDirection: 'row', gap: 16, alignItems: 'center',
    marginHorizontal: 16, marginBottom: 20,
  },
  foodThumb: { width: 88, height: 88, borderRadius: 16 },
  foodThumbPlaceholder: {
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center',
  },
  foodName: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 6 },
  foodCalories: { fontSize: 32, fontWeight: '900', color: '#7B61FF' },

  bjuRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 28 },
  bjuCard: {
    flex: 1, backgroundColor: '#F9F9F9', borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  bjuVal: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  bjuLabel: { fontSize: 12, color: '#9CA3AF' },

  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#6B7280', paddingHorizontal: 16, marginBottom: 10 },

  portionRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 28 },
  portionBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E5E5E5', alignItems: 'center',
  },
  portionBtnActive: { borderColor: '#7B61FF', backgroundColor: '#F0EDF8' },
  portionBtnText: { fontSize: 15, fontWeight: '600', color: '#9CA3AF' },
  portionBtnTextActive: { color: '#7B61FF' },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, backgroundColor: '#7B61FF',
    borderRadius: 16, paddingVertical: 16, marginBottom: 12,
  },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  wrongBtn: { alignItems: 'center', paddingVertical: 10 },
  wrongBtnText: { fontSize: 14, color: '#9CA3AF' },

  manualHint: {
    marginHorizontal: 16, marginTop: 8,
    backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14,
  },
  manualHintText: { fontSize: 13, color: '#6B7280', lineHeight: 20 },
});
