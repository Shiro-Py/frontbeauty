import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { MasterPreviewCard } from '@beautygo/shared';

const masters = [
  { id: '1', name: 'Мария', service: 'Маникюр', rating: 4.8 },
  { id: '2', name: 'Ольга', service: 'Массаж', rating: 4.9 },
];

export default function MastersScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <FlatList
        data={masters}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MasterPreviewCard
            name={item.name}
            service={item.service}
            rating={item.rating}
            onPress={() => router.push(`/profile/${item.id}` as any)}
            avatarPlaceholder={item.name[0]}
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
