import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { sendOtp } from '@beautygo/shared';

/** Форматирует введённые цифры в маску +7 (XXX) XXX-XX-XX */
function formatPhone(digits: string): string {
  const d = digits.slice(0, 10);
  let result = '+7';
  if (d.length === 0) return result;
  result += ' (' + d.slice(0, Math.min(3, d.length));
  if (d.length < 3) return result;
  result += ') ' + d.slice(3, Math.min(6, d.length));
  if (d.length < 6) return result;
  result += '-' + d.slice(6, Math.min(8, d.length));
  if (d.length < 8) return result;
  result += '-' + d.slice(8, 10);
  return result;
}

/** Извлекает 10 цифр локального номера из любого ввода */
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

  const displayValue = formatPhone(digits);
  const isValid = digits.length === 10;

  const handlePhoneChange = (text: string) => {
    const d = extractDigits(text);
    setDigits(d);
    if (d.length > 0 && d.length < 10) {
      setError('Некорректный номер телефона');
    } else {
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    const phone = '+7' + digits;
    setLoading(true);
    setError('');
    try {
      await sendOtp(phone);
      router.push({ pathname: '/auth/otp', params: { phone, mode: mode ?? 'login' } });
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      if (code === 'RATE_LIMITED') {
        setError('Слишком много запросов. Попробуйте через минуту.');
      } else if (code === 'INVALID_PHONE') {
        setError('Неверный формат номера телефона.');
      } else {
        setError('Не удалось отправить код. Попробуйте ещё раз.');
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

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1A1628" />
        </Pressable>

        <Text style={styles.title}>
          {isRegister ? 'Регистрация' : 'Авторизация'}
        </Text>
        <Text style={styles.subtitle}>
          {isRegister
            ? 'Введите номер телефона для создания аккаунта'
            : 'Введите номер телефона, чтобы войти в аккаунт'}
        </Text>

        <View style={[styles.inputWrap, error ? styles.inputWrapError : null]}>
          <TextInput
            style={styles.input}
            value={displayValue}
            onChangeText={handlePhoneChange}
            placeholder="+7 (___) ___-__-__"
            placeholderTextColor="#B0A8B9"
            keyboardType="phone-pad"
            autoFocus
            editable={!loading}
            textContentType="telephoneNumber"
            autoComplete="tel"
          />
          {digits.length > 0 && (
            <Pressable
              onPress={() => { setDigits(''); setError(''); }}
              hitSlop={8}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={18} color="#B0A8B9" />
            </Pressable>
          )}
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.spacer} />

        <Pressable
          style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Получить код</Text>
          }
        </Pressable>

        {isRegister && (
          <Pressable
            style={styles.switchModeButton}
            onPress={() => router.replace({ pathname: '/auth/phone', params: { mode: 'login' } })}
          >
            <Text style={styles.switchModeText}>
              Уже есть аккаунт?{' '}
              <Text style={styles.switchModeLink}>Войти</Text>
            </Text>
          </Pressable>
        )}

        {!isRegister && (
          <Pressable
            style={styles.switchModeButton}
            onPress={() => router.replace({ pathname: '/auth/phone', params: { mode: 'register' } })}
          >
            <Text style={styles.switchModeText}>
              Нет аккаунта?{' '}
              <Text style={styles.switchModeLink}>Зарегистрироваться</Text>
            </Text>
          </Pressable>
        )}

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },

  backButton: { marginBottom: 32 },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1628',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#7A7286',
    marginBottom: 32,
    lineHeight: 22,
  },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderWidth: 1.5,
    borderColor: '#E2DCF0',
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FAFAFA',
    marginBottom: 6,
  },
  inputWrapError: { borderColor: '#FF6B6B' },
  input: {
    flex: 1,
    fontSize: 18,
    color: '#1A1628',
    letterSpacing: 1,
  },
  clearButton: { paddingLeft: 8 },
  errorText: {
    fontSize: 13,
    color: '#FF6B6B',
    marginBottom: 4,
    marginLeft: 2,
  },

  spacer: { flex: 1 },

  button: {
    height: 56,
    backgroundColor: '#7B61FF',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { backgroundColor: '#C4B8FF' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  switchModeButton: { alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  switchModeText: { fontSize: 14, color: '#9CA3AF' },
  switchModeLink: { color: '#7B61FF', fontWeight: '600' },
});
