import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { sendOtp } from '@beautygo/shared';

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return '+7' + digits.slice(1);
  }
  if (digits.length === 10) return '+7' + digits;
  return '+' + digits;
}

function isValidPhone(phone: string): boolean {
  return /^\+7\d{10}$/.test(phone);
}

export default function PhoneScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (text: string) => {
    if (text.length === 1 && /[789]/.test(text)) {
      setPhone('+7');
      return;
    }
    setPhone(text);
  };

  const handleSubmit = async () => {
    const normalized = normalizePhone(phone);
    if (!isValidPhone(normalized)) {
      Alert.alert('Неверный номер', 'Введите номер в формате +7 9XX XXX XX XX');
      return;
    }
    setLoading(true);
    try {
      await sendOtp(normalized);
      router.push({ pathname: '/auth/otp', params: { phone: normalized } });
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      if (code === 'RATE_LIMIT_EXCEEDED') {
        Alert.alert('Подождите', 'Слишком много запросов. Попробуйте через минуту.');
      } else if (code === 'INVALID_PHONE') {
        Alert.alert('Неверный номер', 'Проверьте формат телефона');
      } else {
        Alert.alert('Ошибка', 'Не удалось отправить код. Попробуйте ещё раз.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Введите номер телефона</Text>
        <Text style={styles.subtitle}>Отправим код подтверждения по SMS</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={handlePhoneChange}
          placeholder="+7 900 000 00 00"
          placeholderTextColor="#B0A8B9"
          keyboardType="phone-pad"
          autoFocus
          maxLength={18}
          editable={!loading}
        />
        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Получить код</Text>
          }
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 80 },
  title: { fontSize: 26, fontWeight: '700', color: '#1A1628', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#7A7286', marginBottom: 40 },
  input: {
    height: 56, borderWidth: 1.5, borderColor: '#E2DCF0', borderRadius: 14,
    paddingHorizontal: 16, fontSize: 18, color: '#1A1628',
    backgroundColor: '#FAFAFA', marginBottom: 24, letterSpacing: 1,
  },
  button: {
    height: 56, backgroundColor: '#7B61FF', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  buttonDisabled: { backgroundColor: '#C4B8FF' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
