import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  Animated, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAvatarData, AvatarData, AvatarRecommendation } from '@ayla/shared';

// ─── Floating avatar placeholder ─────────────────────────────────────────────

function AvatarHero({ onCreatePress }: { onCreatePress: () => void }) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -10, duration: 1800, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0,   duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Pressable onPress={onCreatePress}>
      <Animated.View style={[S.avatarCircle, { transform: [{ translateY: floatAnim }] }]}>
        <Ionicons name="person" size={64} color="#C4B5FD" />
      </Animated.View>
    </Pressable>
  );
}

function AvatarHeroWithImage({ imageUrl, onCreatePress }: { imageUrl: string; onCreatePress: () => void }) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -10, duration: 1800, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0,   duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Pressable onPress={onCreatePress}>
      <Animated.View style={[S.avatarCircle, { transform: [{ translateY: floatAnim }] }]}>
        <Ionicons name="person" size={64} color="#C4B5FD" />
        <View style={S.avatarBadge}>
          <Ionicons name="refresh" size={12} color="#fff" />
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ─── Stats cards ─────────────────────────────────────────────────────────────

function StatCard({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View style={S.statCard}>
      <Text style={S.statIcon}>{icon}</Text>
      <Text style={S.statValue}>{value}</Text>
      <Text style={S.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Recommendation card ──────────────────────────────────────────────────────

function RecCard({ rec }: { rec: AvatarRecommendation }) {
  const handleBook = () => {
    if (rec.specialist_id) {
      router.push(`/profile/${rec.specialist_id}`);
    }
  };

  return (
    <View style={S.recCard}>
      <View style={S.recHeader}>
        <Text style={S.recIcon}>{rec.icon}</Text>
        <Text style={S.recTitle}>{rec.title}</Text>
      </View>
      <Text style={S.recDesc}>{rec.description}</Text>
      {rec.specialist_id && (
        <Pressable style={S.recBtn} onPress={handleBook}>
          <Text style={S.recBtnText}>Записаться · {rec.service_name}</Text>
          <Ionicons name="chevron-forward" size={14} color="#7B61FF" />
        </Pressable>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MeScreen() {
  const [data, setData] = useState<AvatarData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const d = await getAvatarData();
      setData(d);
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = () => router.push('/avatar/create');
  const handleHistory = () => router.push('/avatar/history');

  if (loading) {
    return (
      <View style={S.center}>
        <ActivityIndicator size="large" color="#7B61FF" />
      </View>
    );
  }

  const current = data?.current ?? null;
  const stats = data?.weekly_stats;
  const recs = data?.recommendations ?? [];

  return (
    <ScrollView style={S.root} contentContainerStyle={S.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={S.header}>
        <Text style={S.screenTitle}>Я</Text>
        {current && (
          <Pressable onPress={handleHistory} style={S.historyBtn}>
            <Ionicons name="time-outline" size={20} color="#6B7280" />
          </Pressable>
        )}
      </View>

      {/* Avatar hero */}
      <View style={S.heroSection}>
        {current?.image_url ? (
          <AvatarHeroWithImage imageUrl={current.image_url} onCreatePress={handleCreate} />
        ) : (
          <AvatarHero onCreatePress={handleCreate} />
        )}

        {current ? (
          <View style={S.avatarMeta}>
            {current.face_type && <Text style={S.metaChip}>{current.face_type}</Text>}
            {current.skin_tone && <Text style={S.metaChip}>{current.skin_tone}</Text>}
          </View>
        ) : (
          <View style={S.emptyHint}>
            <Text style={S.emptyTitle}>Создай свой AI-аватар</Text>
            <Text style={S.emptyDesc}>Загрузи фото — и получи персональные рекомендации по уходу за собой</Text>
            <Pressable style={S.createBtn} onPress={handleCreate}>
              <Ionicons name="camera-outline" size={18} color="#fff" />
              <Text style={S.createBtnText}>Сделать фото</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Weekly stats */}
      {stats && (
        <View style={S.statsRow}>
          <StatCard icon="🔥" value={`${stats.calories_avg}`} label="ккал/день" />
          <StatCard icon="💅" value={`${stats.master_visits}`} label="визита" />
          <StatCard icon="⚡" value={`${stats.active_days}`} label="активных дней" />
        </View>
      )}

      {/* Recommendations */}
      {recs.length > 0 && (
        <View style={S.section}>
          <Text style={S.sectionTitle}>Рекомендации</Text>
          {recs.map(r => <RecCard key={r.id} rec={r} />)}
        </View>
      )}

      {/* History link */}
      {current && (
        <Pressable style={S.historyRow} onPress={handleHistory}>
          <Ionicons name="bar-chart-outline" size={18} color="#7B61FF" />
          <Text style={S.historyRowText}>История прогресса</Text>
          <Ionicons name="chevron-forward" size={16} color="#7B61FF" />
        </Pressable>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  content: { paddingBottom: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8,
  },
  screenTitle: { fontSize: 28, fontWeight: '700', color: '#1A1A1A' },
  historyBtn: { padding: 8 },

  heroSection: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },

  avatarCircle: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: '#F3F0FF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7B61FF', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 8,
  },
  avatarBadge: {
    position: 'absolute', bottom: 8, right: 8,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#7B61FF',
    alignItems: 'center', justifyContent: 'center',
  },

  avatarMeta: { flexDirection: 'row', gap: 8, marginTop: 16 },
  metaChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: '#F3F0FF', borderRadius: 20,
    fontSize: 13, color: '#7B61FF', fontWeight: '500',
  },

  emptyHint: { alignItems: 'center', marginTop: 20, paddingHorizontal: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#7B61FF', borderRadius: 16,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  createBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  statsRow: {
    flexDirection: 'row', marginHorizontal: 20,
    gap: 10, marginBottom: 24,
  },
  statCard: {
    flex: 1, backgroundColor: '#F9FAFB',
    borderRadius: 16, padding: 14, alignItems: 'center',
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  statLabel: { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },

  section: { paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },

  recCard: {
    backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, marginBottom: 10,
  },
  recHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  recIcon: { fontSize: 20 },
  recTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', flex: 1 },
  recDesc: { fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 10 },
  recBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F3F0FF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  recBtnText: { fontSize: 13, color: '#7B61FF', fontWeight: '600' },

  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 4, marginBottom: 8,
    paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: '#F3F0FF', borderRadius: 16,
  },
  historyRowText: { flex: 1, fontSize: 15, color: '#7B61FF', fontWeight: '600' },
});
