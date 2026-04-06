import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  ActivityIndicator, RefreshControl, Pressable, Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getSpecialists, toggleFavorite, removeFavorite,
  isMasterFavorited, getMe,
  SpecialistListItem,
} from '@beautygo/shared';

const PAGE_SIZE = 10;

function ratingColor(rating: number): string {
  if (rating >= 4) return '#22C55E';
  if (rating >= 3) return '#F59E0B';
  return '#E53935';
}

// ─── Master card ──────────────────────────────────────────────────────────────

function MasterCard({ item, onPress }: {
  item: SpecialistListItem;
  isFav: boolean;
  onFav: () => void;
  onPress: () => void;
}) {
  const rColor = ratingColor(item.rating);
  const services = item.top_services ?? (item.top_service ? [item.top_service] : []);

  return (
    <Pressable style={S.card} onPress={onPress}>
      {/* Top row: avatar + name/meta */}
      <View style={S.cardRow}>
        <View style={S.avatar}>
          <Text style={S.avatarText}>{item.first_name[0]}</Text>
        </View>
        <View style={S.cardMeta}>
          <Text style={S.masterName} numberOfLines={1}>
            {item.first_name} {item.last_name}
          </Text>
          <View style={S.metaRow}>
            <Ionicons name="star" size={12} color={rColor} />
            <Text style={[S.ratingText, { color: rColor }]}>{item.rating.toFixed(1)}</Text>
            <Text style={S.reviewsCount}>({item.reviews_count})</Text>
            {item.distance_km != null && (
              <>
                <View style={S.dot} />
                <Ionicons name="location-outline" size={12} color="#9CA3AF" />
                <Text style={S.distanceText}>{item.distance_km.toFixed(1)} км</Text>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Services list */}
      {services.length > 0 && (
        <View style={S.servicesList}>
          {services.map((svc, i) => (
            <View key={i} style={S.serviceRow}>
              <Text style={S.serviceRowName} numberOfLines={1}>{svc.name}</Text>
              <Text style={S.serviceRowPrice}>
                от {svc.price.toLocaleString('ru-RU')} ₽
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={S.separator} />
    </Pressable>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <View style={S.skeletonCard}>
      <View style={S.skeletonAvatar} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={[S.skeletonLine, { width: '45%', height: 15 }]} />
        <View style={[S.skeletonLine, { width: '30%', height: 12 }]} />
        <View style={[S.skeletonLine, { width: '90%', height: 12, marginTop: 6 }]} />
        <View style={[S.skeletonLine, { width: '80%', height: 12 }]} />
        <View style={[S.skeletonLine, { width: '70%', height: 12 }]} />
      </View>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HomeFeedScreen() {
  const router = useRouter();

  const [userName, setUserName] = useState('');
  const [items, setItems] = useState<SpecialistListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');

  const isFirstLoad = useRef(true);

  useEffect(() => {
    getMe().then(u => {
      const name = [u.first_name, u.last_name ? u.last_name[0] + '.' : ''].filter(Boolean).join(' ');
      setUserName(name || u.phone);
    }).catch(() => {});
  }, []);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (isFirstLoad.current) setLoading(true);
    try {
      const data = await getSpecialists(1, PAGE_SIZE);
      setItems(data.results);
      setPage(1);
      setHasMore(!!data.next);
      setFavorites(new Set(data.results.map(s => s.id).filter(isMasterFavorited)));
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFirstLoad.current = false;
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const data = await getSpecialists(next, PAGE_SIZE);
      setItems(prev => {
        const ids = new Set(prev.map(s => s.id));
        return [...prev, ...data.results.filter(s => !ids.has(s.id))];
      });
      setPage(next);
      setHasMore(!!data.next);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleFavorite = async (id: string) => {
    const was = favorites.has(id);
    setFavorites(prev => { const n = new Set(prev); was ? n.delete(id) : n.add(id); return n; });
    try {
      if (was) await removeFavorite(id); else await toggleFavorite(id);
    } catch {
      setFavorites(prev => { const n = new Set(prev); was ? n.add(id) : n.delete(id); return n; });
    }
  };

  if (loading) {
    return (
      <View style={S.root}>
        <View style={S.header}>
          <View style={[S.skeletonLine, { width: 120, height: 16 }]} />
        </View>
        <View style={S.searchBar}>
          <View style={[S.skeletonLine, { flex: 1, height: 18 }]} />
        </View>
        {[1, 2, 3].map(i => <Skeleton key={i} />)}
      </View>
    );
  }

  const q = search.trim().toLowerCase();
  const filtered = q
    ? items.filter(s => {
        const name = `${s.first_name} ${s.last_name}`.toLowerCase();
        const services = (s.top_services ?? (s.top_service ? [s.top_service] : []));
        return name.includes(q) || services.some(sv => sv.name.toLowerCase().includes(q));
      })
    : items;

  return (
    <FlatList
      style={S.root}
      data={filtered}
      keyExtractor={i => i.id}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#1A1A1A" />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      ListHeaderComponent={
        <>
          {/* Header с именем */}
          <View style={S.header}>
            <View style={S.userAvatar}>
              <Text style={S.userAvatarText}>{userName[0] ?? '?'}</Text>
            </View>
            <Text style={S.userName}>{userName || ' '}</Text>
          </View>

          {/* Search bar */}
          <View style={S.searchRow}>
            <View style={S.searchBar}>
              <TextInput
                style={S.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Поиск"
                placeholderTextColor="#9CA3AF"
                returnKeyType="search"
              />
              <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            </View>
            <Pressable style={S.filterBtn}>
              <Image
                source={require('../../assets/images/icon-filter.png')}
                style={{ width: 18, height: 18, tintColor: '#fff' }}
              />
            </Pressable>
          </View>
        </>
      }
      ListEmptyComponent={
        <View style={S.empty}>
          <Text style={S.emptyTitle}>{search ? 'Ничего не найдено' : 'Мастеров пока нет'}</Text>
          <Text style={S.emptySub}>{search ? 'Попробуйте другой запрос' : 'Попробуйте позже'}</Text>
        </View>
      }
      ListFooterComponent={loadingMore ? <ActivityIndicator color="#1A1A1A" style={{ margin: 16 }} /> : null}
      renderItem={({ item }) => (
        <MasterCard
          item={item}
          isFav={favorites.has(item.id)}
          onFav={() => handleFavorite(item.id)}
          onPress={() => router.push(`/profile/${item.id}` as any)}
        />
      )}
    />
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
  },
  userAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#E5E5E5',
    alignItems: 'center', justifyContent: 'center',
  },
  userAvatarText: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  userName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 8,
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    height: 44, backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1A1A1A' },
  filterBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center',
  },

  // Card
  card: { paddingHorizontal: 16, paddingTop: 14 },
  cardRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#F0F0F0',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  cardMeta: { flex: 1, gap: 4 },
  masterName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12, fontWeight: '700' },
  reviewsCount: { fontSize: 12, color: '#9CA3AF' },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#D1D5DB', marginHorizontal: 2 },
  distanceText: { fontSize: 12, color: '#9CA3AF' },
  servicesList: { marginTop: 10, gap: 6 },
  serviceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceRowName: { fontSize: 13, color: '#4B5563', flex: 1, marginRight: 8 },
  serviceRowPrice: { fontSize: 13, fontWeight: '600', color: '#1A1A1A', flexShrink: 0 },
  separator: { height: 1, backgroundColor: '#F0F0F0', marginTop: 14 },

  // Skeleton
  skeletonCard: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  skeletonAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F0F0F0' },
  skeletonLine: { height: 14, borderRadius: 7, backgroundColor: '#F0F0F0' },

  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#1A1A1A' },
  emptySub: { fontSize: 14, color: '#9CA3AF' },
});
