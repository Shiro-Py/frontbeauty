import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAvatarData, AvatarSnapshot } from '@ayla/shared';

// ─── Timeline item ────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function SnapshotItem({ snap, isLast, index }: { snap: AvatarSnapshot; isLast: boolean; index: number }) {
  const isCurrent = index === 0;

  return (
    <View style={S.timelineItem}>
      {/* Line + dot */}
      <View style={S.timelineLeft}>
        <View style={[S.dot, isCurrent && S.dotActive]} />
        {!isLast && <View style={S.line} />}
      </View>

      {/* Card */}
      <View style={[S.snapCard, isCurrent && S.snapCardActive]}>
        <View style={S.snapCircle}>
          <Ionicons name="person" size={28} color={isCurrent ? '#7B61FF' : '#9CA3AF'} />
        </View>
        <View style={S.snapInfo}>
          <View style={S.snapRow}>
            <Text style={S.snapDate}>{formatDate(snap.created_at)}</Text>
            {isCurrent && <View style={S.currentBadge}><Text style={S.currentBadgeText}>Текущий</Text></View>}
          </View>
          {snap.face_type && <Text style={S.snapMeta}>Тип лица: {snap.face_type}</Text>}
          {snap.skin_tone && <Text style={S.snapMeta}>Тон кожи: {snap.skin_tone}</Text>}
        </View>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AvatarHistoryScreen() {
  const [history, setHistory] = useState<AvatarSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const d = await getAvatarData();
      // newest first
      setHistory([...d.history].reverse());
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить историю');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={S.root}>
      {/* Header */}
      <View style={S.header}>
        <Pressable style={S.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </Pressable>
        <Text style={S.title}>История прогресса</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={S.center}>
          <ActivityIndicator size="large" color="#7B61FF" />
        </View>
      ) : history.length === 0 ? (
        <View style={S.center}>
          <Text style={S.emptyText}>История пустая. Создай свой первый аватар.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={S.list} showsVerticalScrollIndicator={false}>
          <Text style={S.subtitle}>{history.length} {history.length === 1 ? 'снимок' : 'снимка'}</Text>
          {history.map((snap, i) => (
            <SnapshotItem key={snap.id} snap={snap} isLast={i === history.length - 1} index={i} />
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { fontSize: 15, color: '#9CA3AF', textAlign: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },

  list: { paddingHorizontal: 20, paddingTop: 8 },
  subtitle: { fontSize: 13, color: '#9CA3AF', marginBottom: 20 },

  timelineItem: { flexDirection: 'row', marginBottom: 0 },
  timelineLeft: { width: 28, alignItems: 'center' },
  dot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#D1D5DB', marginTop: 16,
  },
  dotActive: { backgroundColor: '#7B61FF', width: 14, height: 14, borderRadius: 7, marginTop: 15 },
  line: { flex: 1, width: 2, backgroundColor: '#E5E7EB', marginTop: 4 },

  snapCard: {
    flex: 1, flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: '#F9FAFB', borderRadius: 16, padding: 14,
    marginLeft: 12, marginBottom: 10,
  },
  snapCardActive: { backgroundColor: '#F3F0FF', borderWidth: 1, borderColor: '#C4B5FD' },

  snapCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  snapInfo: { flex: 1 },
  snapRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  snapDate: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  snapMeta: { fontSize: 13, color: '#6B7280', marginTop: 2 },

  currentBadge: {
    backgroundColor: '#7B61FF', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  currentBadgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },
});
