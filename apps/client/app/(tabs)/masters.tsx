import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  ActivityIndicator, RefreshControl, Pressable,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  MasterPreviewCard, getSpecialists, toggleFavorite, removeFavorite,
  isMasterFavorited, SpecialistListItem,
} from '@beautygo/shared';

const PAGE_SIZE = 10;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonInfo}>
        <View style={[styles.skeletonLine, { width: '60%' }]} />
        <View style={[styles.skeletonLine, { width: '40%', marginTop: 6 }]} />
        <View style={[styles.skeletonLine, { width: '30%', marginTop: 6 }]} />
      </View>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HomeFeedScreen() {
  const router = useRouter();

  const [items, setItems] = useState<SpecialistListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const isFirstLoad = useRef(true);

  const syncFavorites = useCallback((data: SpecialistListItem[]) => {
    setFavorites(new Set(data.map(s => s.id).filter(isMasterFavorited)));
  }, []);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (isFirstLoad.current) setLoading(true);

    try {
      const data = await getSpecialists(1, PAGE_SIZE);
      setItems(data.results);
      setPage(1);
      setHasMore(!!data.next);
      syncFavorites(data.results);
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFirstLoad.current = false;
    }
  }, [syncFavorites]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await getSpecialists(nextPage, PAGE_SIZE);
      setItems(prev => {
        const ids = new Set(prev.map(s => s.id));
        const fresh = data.results.filter(s => !ids.has(s.id));
        return [...prev, ...fresh];
      });
      setPage(nextPage);
      setHasMore(!!data.next);
      syncFavorites(data.results);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleFavorite = async (id: string) => {
    const wasFavorite = favorites.has(id);
    setFavorites(prev => {
      const next = new Set(prev);
      wasFavorite ? next.delete(id) : next.add(id);
      return next;
    });
    try {
      if (wasFavorite) await removeFavorite(id);
      else await toggleFavorite(id);
    } catch {
      setFavorites(prev => {
        const next = new Set(prev);
        wasFavorite ? next.add(id) : next.delete(id);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.searchBar}>
          <View style={[styles.skeletonLine, { flex: 1, height: 20, borderRadius: 10 }]} />
        </View>
        {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
      </View>
    );
  }

  const filtered = searchQuery.trim()
    ? items.filter(s =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.top_service?.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : items;

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor="#7B61FF"
            colors={['#7B61FF']}
          />
        }
        ListHeaderComponent={
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#B0A8B9" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Поиск мастеров и услуг..."
              placeholderTextColor="#B0A8B9"
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color="#B0A8B9" />
              </Pressable>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={64} color="#C8C2E8" />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'Ничего не найдено' : 'Мастеров пока нет'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Попробуйте другой запрос'
                : 'Попробуйте позже — мастера скоро появятся'}
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color="#7B61FF" style={{ marginVertical: 16 }} />
          ) : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        renderItem={({ item }) => (
          <MasterPreviewCard
            name={`${item.first_name} ${item.last_name}`}
            service={item.top_service?.name ?? 'Мастер'}
            rating={item.rating}
            price={item.top_service?.price}
            duration_minutes={item.top_service?.duration_minutes}
            distance_km={item.distance_km}
            onPress={() => router.push(`/profile/${item.id}` as any)}
            avatarPlaceholder={item.first_name[0]}
            isFavorite={favorites.has(item.id)}
            onFavorite={() => handleFavorite(item.id)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5FF' },
  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 12, height: 48,
    marginBottom: 12, marginTop: 4,
    borderWidth: 1, borderColor: '#F0EDF8',
    shadowColor: '#7B61FF', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#1A1628' },

  empty: {
    alignItems: 'center', justifyContent: 'center',
    paddingTop: 80, paddingHorizontal: 40, gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1628' },
  emptySubtitle: { fontSize: 14, color: '#7A7286', textAlign: 'center', lineHeight: 20 },

  // Skeleton
  skeletonCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginHorizontal: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#F0EDF8',
  },
  skeletonAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#EDE8FF', marginRight: 14,
  },
  skeletonInfo: { flex: 1 },
  skeletonLine: {
    height: 14, borderRadius: 7, backgroundColor: '#EDE8FF',
  },
});
