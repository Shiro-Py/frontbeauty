import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { sendOtp } from '@beautygo/shared';

function formatPhone(digits: string): string {
  const d = digits.slice(0, 10);
  let r = '+7';
  if (!d.length) return r;
  r += ' ' + d.slice(0, Math.min(3, d.length));
  if (d.length < 3) return r;
  r += ' ' + d.slice(3, Math.min(6, d.length));
  if (d.length < 6) return r;
  r += ' ' + d.slice(6, Math.min(8, d.length));
  if (d.length < 8) return r;
  r += ' ' + d.slice(8, 10);
  return r;
}

function extractDigits(text: string): string {
  const all = text.replace(/\D/g, '');
  const local = all.startsWith('7') || all.startsWith('8') ? all.slice(1) : all;
  return local.slice(0, 10);
}

export default function PhoneScreen() {
  const { mode } = useLocalSearchParams<{ mode?: 'login' | 'register' }>();
  const isRegister = mode === 'register';

  const [digits, setDigits] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValid = digits.length === 10;

  const handleChange = (text: string) => {
    const d = extractDigits(text);
    setDigits(d);
    setError(d.length > 0 && d.length < 10 ? 'Некорректный номер телефона' : '');
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError('');
    try {
      await sendOtp('+7' + digits);
      router.push({ pathname: '/auth/otp', params: { phone: '+7' + digits, mode: mode ?? 'login' } });
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      if (code === 'RATE_LIMITED') setError('Слишком много запросов. Попробуйте через минуту.');
      else if (code === 'INVALID_PHONE') setError('Некорректный номер телефона');
      else setError('Не удалось отправить код. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={S.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      <View style={S.inner}>
        <Pressable style={S.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
        </Pressable>

        <Text style={S.title}>Введите номер телефона</Text>

        <View style={[S.inputWrap, !!error && S.inputWrapError]}>
          <TextInput
            style={S.input}
            value={digits.length ? formatPhone(digits) : ''}
            onChangeText={handleChange}
            placeholder="Номер телефона"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            autoFocus
            editable={!loading}
            textContentType="telephoneNumber"
            autoComplete="tel"
          />
          {digits.length > 0 && (
            <Pressable onPress={() => { setDigits(''); setError(''); }} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        {!!error && <Text style={S.errorText}>{error}</Text>}
      </View>

      {/* Sticky кнопка внизу */}
      <View style={S.bottomBar}>
        <Pressable
          style={[S.btn, (!isValid || loading) && S.btnDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={[S.btnText, (!isValid || loading) && S.btnTextDisabled]}>Продолжить</Text>
          }
        </Pressable>
      </View>

    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, paddingHorizontal: 20, paddingTop: 56 },

  back: { marginBottom: 28 },

  title: { fontSize: 24, fontWeight: '700', color: '#1A1A1A', marginBottom: 24 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    height: 52, borderWidth: 1, borderColor: '#E5E5E5',
    borderRadius: 12, paddingHorizontal: 14, backgroundColor: '#fff',
  },
  inputWrapError: { borderColor: '#E53935' },
  input: { flex: 1, fontSize: 16, color: '#1A1A1A' },
  errorText: { fontSize: 13, color: '#E53935', marginTop: 6 },

  bottomBar: { paddingHorizontal: 20, paddingBottom: 40 },
  btn: {
    height: 52, borderRadius: 999, backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { backgroundColor: '#E5E5E5' },
  btnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  btnTextDisabled: { color: '#9CA3AF' },
});
