import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  name: string;
  service: string;
  rating: number;
  onPress: () => void;
  avatarPlaceholder?: string;
  isFavorite?: boolean;
  onFavorite?: () => void;
};

export default function MasterPreviewCard({
  name,
  service,
  rating,
  onPress,
  avatarPlaceholder,
  isFavorite = false,
  onFavorite,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handleFavorite = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, speed: 50 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }),
    ]).start();
    onFavorite?.();
  };

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{avatarPlaceholder ?? name[0]}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.service}>{service} · ★{rating}</Text>
      </View>

      {onFavorite !== undefined && (
        <Animated.View style={{ transform: [{ scale }] }}>
          <Pressable onPress={handleFavorite} hitSlop={10} style={styles.heartBtn}>
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EDE8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#7B61FF' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#1A1628', marginBottom: 4 },
  service: { fontSize: 14, color: '#7A7286' },
  heartBtn: { padding: 4 },
});
