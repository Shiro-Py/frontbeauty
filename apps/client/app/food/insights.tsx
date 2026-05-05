import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getInsights, WeeklyInsights, VitaminInsight } from '@ayla/shared';

function InsightCard({ item, onBook }: { item: VitaminInsight; onBook?: () => void }) {
  return (
    <View style={S.card}>
      <View style={S.cardHeader}>
        <Text style={S.cardIcon}>{item.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={S.cardTitle}>{item.name}</Text>
          <Text style={S.cardPct}>{item.actual_pct}% от нормы</Text>
        </View>
        <View style={[S.pctBadge, { backgroundColor: item.actual_pct < 50 ? '#FEE2E2' : '#FEF3C7' }]}>
          <Text style={[S.pctBadgeText, { color: item.actual_pct < 50 ? '#EF4444' : '#F59E0B' }]}>
            {item.actual_pct < 50 ? 'Дефицит' : 'Мало'}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={S.progressTrack}>
        <View style={[
          S.progressFill,
          {
            width: `${item.actual_pct}%` as any,
            backgroundColor: item.actual_pct < 50 ? '#EF4444' : '#F59E0B',
          },
        ]} />
      </View>

      {/* Recommended foods */}
      <Text style={S.foodsLabel}>Добавь в рацион:</Text>
      <Text style={S.foodsList}>{item.recommended_foods.join(' · ')}</Text>

      {/* Beauty link */}
      {item.beauty_link && (
        <Pressable style={S.beautyLink} onPress={onBook}>
          <Ionicons name="sparkles-outline" size={14} color="#7B61FF" />
          <View style={{ flex: 1 }}>
            <Text style={S.beautyLinkText}>{item.beauty_link.text}</Text>
            <Text style={S.beautyLinkService}>{item.beauty_link.service_name} →</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

export default function InsightsScreen() {
  const router = useRouter();
  const [data, setData] = useState<WeeklyInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInsights().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={[S.root, S.center]}>
        <ActivityIndicator color="#7B61FF" size="large" />
      </View>
    );
  }

  if (!data) return null;

  return (
    <ScrollView style={S.root} contentContainerStyle={S.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={S.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
        </Pressable>
        <Text style={S.headerTitle}>Отчёт за неделю</Text>
        <View style={{ width: 24 }} />
      </View>

      {!data.has_enough_data ? (
        <View style={S.emptyState}>
          <Text style={S.emptyEmoji}>📊</Text>
          <Text style={S.emptyTitle}>Мало данных</Text>
          <Text style={S.emptySub}>
            Записывай питание минимум 3 дня, чтобы увидеть отчёт о дефиците витаминов
          </Text>
          <Pressable style={S.emptyBtn} onPress={() => router.back()}>
            <Text style={S.emptyBtnText}>Записать блюдо</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={S.intro}>
            <Text style={S.introTitle}>Чего не хватает твоему организму</Text>
            <Text style={S.introSub}>На основе питания за последние 7 дней</Text>
          </View>

          {data.deficiencies.map((item, i) => (
            <InsightCard
              key={i}
              item={item}
              onBook={item.beauty_link?.specialist_id
                ? () => router.push(`/profile/${item.beauty_link!.specialist_id}` as any)
                : undefined}
            />
          ))}

          <View style={S.disclaimer}>
            <Ionicons name="information-circle-outline" size={14} color="#9CA3AF" />
            <Text style={S.disclaimerText}>
              Данные носят информационный характер. Проконсультируйтесь с врачом.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  content: { paddingBottom: 48 },
  center: { alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },

  intro: { paddingHorizontal: 16, marginBottom: 16 },
  introTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  introSub: { fontSize: 14, color: '#9CA3AF' },

  card: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#FAFAFA', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardIcon: { fontSize: 32 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  cardPct: { fontSize: 13, color: '#6B7280' },
  pctBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pctBadgeText: { fontSize: 12, fontWeight: '700' },

  progressTrack: { height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
  progressFill: { height: 8, borderRadius: 4 },

  foodsLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginBottom: 4 },
  foodsList: { fontSize: 14, color: '#4B5563', marginBottom: 12 },

  beautyLink: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F0EDF8', borderRadius: 10, padding: 12,
  },
  beautyLinkText: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  beautyLinkService: { fontSize: 13, fontWeight: '700', color: '#7B61FF' },

  emptyState: { alignItems: 'center', padding: 32, gap: 12, marginTop: 40 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  emptySub: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 22 },
  emptyBtn: {
    marginTop: 8, backgroundColor: '#7B61FF',
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14,
  },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  disclaimer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    marginHorizontal: 16, marginTop: 8, padding: 12,
    backgroundColor: '#F9F9F9', borderRadius: 10,
  },
  disclaimerText: { flex: 1, fontSize: 12, color: '#9CA3AF', lineHeight: 18 },
});
