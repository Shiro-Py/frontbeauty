import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function ScanScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCamera = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Нет доступа к камере', 'Разрешите доступ в настройках телефона.', [
        { text: 'OK' },
      ]);
      return;
    }
    setLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]) {
        router.push({
          pathname: '/food/result',
          params: { imageUri: result.assets[0].uri },
        } as any);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      router.push({
        pathname: '/food/result',
        params: { imageUri: result.assets[0].uri },
      } as any);
    }
  };

  if (loading) {
    return (
      <View style={[S.root, S.center]}>
        <ActivityIndicator color="#fff" size="large" />
        <Text style={S.loadingText}>Открываю камеру...</Text>
      </View>
    );
  }

  return (
    <View style={S.root}>
      {/* Header */}
      <Pressable style={S.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color="#fff" />
      </Pressable>

      {/* Center hint */}
      <View style={S.hintArea}>
        <View style={S.frameBorder} />
        <Text style={S.hintText}>Наведи камеру на блюдо</Text>
        <Text style={S.hintSub}>Сделай чёткое фото при хорошем освещении</Text>
      </View>

      {/* Bottom controls */}
      <View style={S.bottomBar}>
        {/* Gallery */}
        <Pressable style={S.sideBtn} onPress={handleGallery}>
          <Ionicons name="images-outline" size={26} color="#fff" />
          <Text style={S.sideBtnLabel}>Галерея</Text>
        </Pressable>

        {/* Camera button */}
        <Pressable style={S.captureBtn} onPress={handleCamera}>
          <View style={S.captureBtnInner} />
        </Pressable>

        {/* Placeholder right */}
        <View style={S.sideBtn} />
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0D0D' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 15, color: '#fff', marginTop: 8 },

  backBtn: {
    position: 'absolute', top: 52, left: 16, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  hintArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  frameBorder: {
    width: 220, height: 220,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 20, marginBottom: 24,
  },
  hintText: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 8 },
  hintSub: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', paddingHorizontal: 40 },

  bottomBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingHorizontal: 24, paddingBottom: 48, paddingTop: 16,
  },
  sideBtn: { width: 60, alignItems: 'center', gap: 4 },
  sideBtnLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  captureBtn: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 3, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  captureBtnInner: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: '#fff',
  },
});
