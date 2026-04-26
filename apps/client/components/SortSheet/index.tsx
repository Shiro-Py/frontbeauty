import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_H = Dimensions.get('window').height;

export type SortOption =
  | 'recommended'
  | 'rating'
  | 'distance'
  | 'price_asc'
  | 'price_desc'
  | 'next_slot';

export const SORT_OPTIONS: { value: SortOption; label: string; icon: string }[] = [
  { value: 'recommended', label: 'По рекомендации', icon: 'sparkles-outline' },
  { value: 'rating',      label: 'По рейтингу',     icon: 'star-outline' },
  { value: 'distance',    label: 'По расстоянию',   icon: 'location-outline' },
  { value: 'price_asc',   label: 'По цене ↑',        icon: 'arrow-up-outline' },
  { value: 'price_desc',  label: 'По цене ↓',        icon: 'arrow-down-outline' },
  { value: 'next_slot',   label: 'По ближайшему слоту', icon: 'time-outline' },
];

export function sortLabel(sort: SortOption): string {
  return SORT_OPTIONS.find(o => o.value === sort)?.label ?? 'По рекомендации';
}

interface Props {
  visible: boolean;
  current: SortOption;
  onSelect: (sort: SortOption) => void;
  onClose: () => void;
}

export default function SortSheet({ visible, current, onSelect, onClose }: Props) {
  const anim = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(anim, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
    } else {
      Animated.timing(anim, { toValue: SCREEN_H, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={S.overlay} onPress={onClose} />
      <Animated.View style={[S.sheet, { transform: [{ translateY: anim }] }]}>
        <View style={S.handle} />
        <Text style={S.title}>Сортировка</Text>

        {SORT_OPTIONS.map(opt => {
          const active = current === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[S.row, active && S.rowActive]}
              onPress={() => { onSelect(opt.value); onClose(); }}
            >
              <View style={[S.iconWrap, active && S.iconWrapActive]}>
                <Ionicons
                  name={opt.icon as any}
                  size={18}
                  color={active ? '#7B61FF' : '#9CA3AF'}
                />
              </View>
              <Text style={[S.label, active && S.labelActive]}>{opt.label}</Text>
              {active && (
                <Ionicons name="checkmark" size={18} color="#7B61FF" style={{ marginLeft: 'auto' }} />
              )}
            </Pressable>
          );
        })}

        <View style={{ height: 32 }} />
      </Animated.View>
    </Modal>
  );
}

const S = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingHorizontal: 20,
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4,
    borderRadius: 2, backgroundColor: '#E5E5E5', marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 13, paddingHorizontal: 12,
    borderRadius: 14, marginBottom: 4,
  },
  rowActive: { backgroundColor: '#F3F0FF' },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: '#EDE8FF' },
  label: { fontSize: 15, color: '#4B5563', fontWeight: '500' },
  labelActive: { color: '#7B61FF', fontWeight: '700' },
});
