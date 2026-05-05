import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Alert,
  Animated, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { createAvatar } from '@ayla/shared';

// ─── Generating animation ─────────────────────────────────────────────────────

function GeneratingAnim() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -12, duration: 220, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0,   duration: 220, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      );
    Animated.parallel([anim(dot1, 0), anim(dot2, 160), anim(dot3, 320)]).start();
  }, []);

  return (
    <View style={S.genBox}>
      <View style={S.avatarGenCircle}>
        <Ionicons name="sparkles" size={40} color="#C4B5FD" />
      </View>
      <View style={S.dotsRow}>
        {[dot1, dot2, dot3].map((d, i) => (
          <Animated.View key={i} style={[S.dot, { transform: [{ translateY: d }] }]} />
        ))}
      </View>
      <Text style={S.genTitle}>Анализирую твоё фото</Text>
      <Text style={S.genDesc}>AI изучает тип лица, тон кожи и подбирает рекомендации</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type Stage = 'idle' | 'generating';

export default function AvatarCreateScreen() {
  const [stage, setStage] = useState<Stage>('idle');

  async function pickCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Нет доступа к камере', 'Разрешите доступ в настройках');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      await generate(result.assets[0].uri);
    }
  }

  async function pickGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      await generate(result.assets[0].uri);
    }
  }

  async function generate(uri: string) {
    setStage('generating');
    try {
      await createAvatar(uri);
      router.back();
    } catch {
      setStage('idle');
      Alert.alert('Ошибка', 'Не удалось создать аватар. Попробуй ещё раз.');
    }
  }

  return (
    <View style={S.root}>
      {/* Back */}
      <Pressable style={S.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
      </Pressable>

      {stage === 'generating' ? (
        <GeneratingAnim />
      ) : (
        <View style={S.idleContent}>
          <View style={S.heroCircle}>
            <Ionicons name="person-outline" size={72} color="#C4B5FD" />
          </View>

          <Text style={S.title}>Создать AI-аватар</Text>
          <Text style={S.desc}>
            Загрузи чёткое фото лица при хорошем освещении.{'\n'}
            Мы проанализируем тип лица, тон кожи и подберём персональные рекомендации.
          </Text>

          <View style={S.tips}>
            {['Хорошее освещение', 'Лицо по центру', 'Без фильтров'].map(t => (
              <View key={t} style={S.tipRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={S.tipText}>{t}</Text>
              </View>
            ))}
          </View>

          <Pressable style={S.primaryBtn} onPress={pickCamera}>
            <Ionicons name="camera-outline" size={20} color="#fff" />
            <Text style={S.primaryBtnText}>Сделать фото</Text>
          </Pressable>
          <Pressable style={S.secondaryBtn} onPress={pickGallery}>
            <Ionicons name="images-outline" size={20} color="#7B61FF" />
            <Text style={S.secondaryBtnText}>Выбрать из галереи</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  backBtn: {
    position: 'absolute', top: 56, left: 20, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },

  idleContent: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, paddingTop: 60,
  },
  heroCircle: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: '#F3F0FF',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 32,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A1A', textAlign: 'center', marginBottom: 12 },
  desc: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 24 },

  tips: { alignSelf: 'stretch', marginBottom: 32, gap: 8 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipText: { fontSize: 14, color: '#374151' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#7B61FF', borderRadius: 16,
    paddingHorizontal: 32, paddingVertical: 14,
    alignSelf: 'stretch', justifyContent: 'center', marginBottom: 12,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F3F0FF', borderRadius: 16,
    paddingHorizontal: 32, paddingVertical: 14,
    alignSelf: 'stretch', justifyContent: 'center',
  },
  secondaryBtnText: { color: '#7B61FF', fontWeight: '600', fontSize: 16 },

  genBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  avatarGenCircle: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: '#F3F0FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 32,
  },
  dotsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#7B61FF' },
  genTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', textAlign: 'center', marginBottom: 10 },
  genDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
});
