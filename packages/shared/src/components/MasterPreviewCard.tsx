import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  id?: string;
  name: string;
  service: string;
  rating: number;
  onPress: () => void;
  avatarPlaceholder?: string;
  isFavorite?: boolean;
  onFavorite?: () => void;
  price?: number;
  duration_minutes?: number;
  distance_km?: number;
};

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h}ч ${m}м`;
}

export default function MasterPreviewCard({
  id, name, service, rating, onPress, avatarPlaceholder,
  isFavorite = false, onFavorite,
  price, duration_minutes, distance_km,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handleFavorite = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, speed: 50 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }),
    ]).start();
    onFavorite?.();
  };

  const hasMeta = price != null || duration_minutes != null || distance_km != null;

  return (
    <Pressable testID={id ? `master-card-${id}` : 'master-card'} style={styles.card} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{avatarPlaceholder ?? name[0]}</Text>
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color="#FFBC00" />
            <Text testID="master-rating" style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        </View>

        <Text style={styles.service} numberOfLines={1}>{service}</Text>

        {hasMeta && (
          <View style={styles.metaRow}>
            {duration_minutes != null && (
              <Text style={styles.metaText}>{formatDuration(duration_minutes)}</Text>
            )}
            {duration_minutes != null && price != null && (
              <Text style={styles.metaSep}>·</Text>
            )}
            {price != null && (
              <Text style={styles.price}>{price.toLocaleString('ru-RU')} ₽</Text>
            )}
            {distance_km != null && (
              <>
                <Text style={styles.metaSep}>·</Text>
                <Ionicons name="location-outline" size={11} color="#B0A8B9" />
                <Text style={styles.metaText}>{distance_km} км</Text>
              </>
            )}
          </View>
        )}
      </View>

      {onFavorite !== undefined && (
        <Animated.View style={{ transform: [{ scale }] }}>
          <Pressable testID="favorite-toggle-btn" onPress={handleFavorite} hitSlop={10} style={styles.heartBtn}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorite ? '#FF4B6E' : '#C8C2E8'}
            />
          </Pressable>
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0EDF8',
    shadowColor: '#7B61FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#EDE8FF', alignItems: 'center',
    justifyContent: 'center', marginRight: 14, flexShrink: 0,
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#7B61FF' },
  info: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  name: { fontSize: 15, fontWeight: '600', color: '#1A1628', flex: 1, marginRight: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 12, fontWeight: '600', color: '#1A1628' },
  service: { fontSize: 13, color: '#7A7286', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  metaText: { fontSize: 12, color: '#B0A8B9' },
  metaSep: { fontSize: 12, color: '#C8C2E8' },
  price: { fontSize: 13, fontWeight: '700', color: '#7B61FF' },
  heartBtn: { padding: 4 },
});
