import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { updateClientProfile, useAuth, tokenStorage } from '@beautygo/shared';

export default function OnboardingScreen() {
  const { signIn } = useAuth();

  const [step, setStep] = useState<'form' | 'success'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const nameValid = name.trim().length >= 2;
  const emailValid = email.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = nameValid && agreed && !loading;

  const handleFinish = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await updateClientProfile({
        first_name: name.trim(),
        ...(email.trim() && { email: email.trim() }),
      });
    } catch { /* продолжаем даже при ошибке */ }
    setLoading(false);
    setStep('success');
  };

  const handleSuccess = async () => {
    try {
      const access = await tokenStorage.getAccess();
      const refresh = await tokenStorage.getRefresh();
      if (access && refresh) await signIn(access, refresh, false);
    } catch {
      router.replace('/');
    }
  };

  // ── Экран успеха ──────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <View style={S.successRoot}>
        <View style={S.successBody}>
          <View style={S.checkCircle}>
            <Ionicons name="checkmark" size={48} color="#fff" />
          </View>
          <Text style={S.successTitle}>Регистрация завершена!</Text>
          <Text style={S.successSub}>
            Добро пожаловать! Аккаунт успешно создан, и вы готовы начать. Если что — мы рядом и всегда поможем ✨
          </Text>
        </View>
        <View style={S.bottomBar}>
          <Pressable style={S.btn} onPress={handleSuccess}>
            <Text style={S.btnText}>Понятно</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Форма данных ──────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={S.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={S.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={S.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
        </Pressable>

        <Text style={S.title}>Укажите свои данные</Text>

        <TextInput
          style={S.input}
          value={name}
          onChangeText={setName}
          placeholder="Ваше имя"
          placeholderTextColor="#9CA3AF"
          autoFocus
          autoCapitalize="words"
        />

        <TextInput
          style={S.input}
          value={email}
          onChangeText={setEmail}
          placeholder="E-mail"
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <Pressable style={S.checkRow} onPress={() => setAgreed(v => !v)}>
          <View style={[S.checkbox, agreed && S.checkboxOn]}>
            {agreed && <Ionicons name="checkmark" size={13} color="#fff" />}
          </View>
          <Text style={S.checkLabel}>Соглашаюсь с правилами сервиса</Text>
        </Pressable>

        <View style={{ flex: 1 }} />
      </ScrollView>

      <View style={S.bottomBar}>
        <Pressable
          style={[S.btn, !canSubmit && S.btnDisabled]}
          onPress={handleFinish}
          disabled={!canSubmit}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={[S.btnText, !canSubmit && S.btnTextDisabled]}>Завершить регистрацию</Text>
          }
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  inner: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20 },

  back: { marginBottom: 28 },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A1A', marginBottom: 24 },

  input: {
    height: 52, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 12,
    paddingHorizontal: 14, fontSize: 16, color: '#1A1A1A', marginBottom: 12,
  },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 1.5,
    borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  checkLabel: { fontSize: 14, color: '#1A1A1A' },

  bottomBar: { paddingHorizontal: 20, paddingBottom: 40 },
  btn: {
    height: 52, borderRadius: 999, backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { backgroundColor: '#E5E5E5' },
  btnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  btnTextDisabled: { color: '#9CA3AF' },

  // Success
  successRoot: { flex: 1, backgroundColor: '#fff' },
  successBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  checkCircle: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center', marginBottom: 28,
  },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 12, textAlign: 'center' },
  successSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
});
