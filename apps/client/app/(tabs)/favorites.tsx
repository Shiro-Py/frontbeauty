import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MasterPreviewCard, getFavorites, toggleFavorite, removeFavorite, MasterDetail } from '@beautygo/shared';

export default function FavoritesScreen() {
  const router = useRouter();
  const [masters, setMasters] = useState<MasterDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getFavorites();
      setMasters(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Перезагружаем при каждом фокусе таба
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleFavorite = async (id: string) => {
    const master = masters.find(m => m.id === id);
    if (!master) return;

    // Оптимистично убираем из списка
    setMasters(prev => prev.filter(m => m.id !== id));

    try {
      await removeFavorite(id);
    } catch {
      // Откат — возвращаем мастера
      setMasters(prev => [...prev, master]);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7B61FF" />
      </View>
    );
  }

  return (
    <FlatList
      testID="favorites-list"
      style={styles.container}
      data={masters}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.list, masters.length === 0 && styles.emptyList]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true)}
          tintColor="#7B61FF"
          colors={['#7B61FF']}
        />
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={64} color="#C8C2E8" />
          <Text testID="favorites-empty" style={styles.emptyTitle}>Нет избранных мастеров</Text>
          <Text style={styles.emptySubtitle}>
            Нажмите ❤️ на карточке мастера, чтобы добавить его в избранное
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <MasterPreviewCard
          name={`${item.first_name} ${item.last_name}`}
          service={item.portfolio.length > 0 ? 'Мастер' : 'Мастер'}
          rating={item.rating}
          onPress={() => router.push(`/profile/${item.id}` as any)}
          avatarPlaceholder={item.first_name[0]}
          isFavorite={true}
          onFavorite={() => handleFavorite(item.id)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5FF' },
  list: { padding: 16, gap: 12 },
  emptyList: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1628',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#7A7286',
    textAlign: 'center',
    lineHeight: 20,
  },
});
