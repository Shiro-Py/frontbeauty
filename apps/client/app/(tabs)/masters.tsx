import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MasterPreviewCard, toggleFavorite, removeFavorite, isMasterFavorited } from '@beautygo/shared';

const MOCK_MASTERS = [
  { id: '1', name: 'Мария Иванова', service: 'Маникюр', rating: 4.8 },
  { id: '2', name: 'Ольга Смирнова', service: 'Массаж', rating: 4.9 },
  { id: '3', name: 'Анна Петрова', service: 'Волосы', rating: 4.7 },
  { id: '4', name: 'Елена Козлова', service: 'Брови', rating: 5.0 },
];

export default function MastersScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Синхронизируем состояние со стором при каждом фокусе таба
  useFocusEffect(useCallback(() => {
    setFavorites(new Set(MOCK_MASTERS.map(m => m.id).filter(isMasterFavorited)));
  }, []));

  const handleFavorite = async (id: string) => {
    const wasFavorite = favorites.has(id);

    // Оптимистичное обновление
    setFavorites(prev => {
      const next = new Set(prev);
      wasFavorite ? next.delete(id) : next.add(id);
      return next;
    });

    try {
      if (wasFavorite) {
        await removeFavorite(id);
      } else {
        await toggleFavorite(id);
      }
    } catch {
      // Откат при ошибке
      setFavorites(prev => {
        const next = new Set(prev);
        wasFavorite ? next.add(id) : next.delete(id);
        return next;
      });
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={MOCK_MASTERS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MasterPreviewCard
            name={item.name}
            service={item.service}
            rating={item.rating}
            onPress={() => router.push(`/profile/${item.id}` as any)}
            avatarPlaceholder={item.name[0]}
            isFavorite={favorites.has(item.id)}
            onFavorite={() => handleFavorite(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5FF' },
  list: { padding: 16, gap: 12 },
});
