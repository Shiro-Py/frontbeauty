import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { sendOtp } from '@beautygo/shared';

function formatPhone(digits: string): string {
  const d = digits.slice(0, 10);
  if (d.length === 0) return '';
  let r = '+7 ';
  r += d.slice(0, Math.min(3, d.length));
  if (d.length > 3) r += ' ' + d.slice(3, Math.min(6, d.length));
  if (d.length > 6) r += ' ' + d.slice(6, Math.min(8, d.length));
  if (d.length > 8) r += ' ' + d.slice(8, 10);
  return r;
}

function extractDigits(text: string): string {
  const all = text.replace(/\D/g, '');
  const local = all.startsWith('7') || all.startsWith('8') ? all.slice(1) : all;
  return local.slice(0, 10);
}

export default function PhoneScreen() {
  const [digits, setDigits] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const displayValue = formatPhone(digits);
  const isValid = digits.length === 10;

  const handleChange = (text: string) => {
    const d = extractDigits(text);
    setDigits(d);
    // Показываем ошибку если пользователь начал вводить, но номер неполный
    if (d.length > 0 && d.length < 10) {
      setError('Некорректный номер телефона');
    } else {
      setError('');
    }
  };

  const handleClear = () => {
    setDigits('');
    setError('');
  };

  const handleSubmit = async () => {
    if (!isValid || loading) return;
    const phone = '+7' + digits;
    setLoading(true);
    setError('');
    try {
      await sendOtp(phone);
      router.push({ pathname: '/auth/otp', params: { phone } });
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      if (code === 'RATE_LIMITED') {
        setError('Слишком много запросов. Попробуйте через минуту');
      } else if (code === 'INVALID_PHONE') {
        setError('Некорректный номер телефона');
      } else {
        setError('Не удалось отправить код. Попробуйте ещё раз');
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

        <Pressable style={styles.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1C1C1E" />
        </Pressable>

        <Text style={styles.title}>Авторизация</Text>

        {/* Поле телефона */}
        <View style={[styles.inputWrap, error ? styles.inputWrapError : null]}>
          <TextInput
            style={styles.input}
            value={displayValue}
            onChangeText={handleChange}
            placeholder="Номер телефона"
            placeholderTextColor="#C0BCC8"
            keyboardType="phone-pad"
            autoFocus
            editable={!loading}
            textContentType="telephoneNumber"
            autoComplete="tel"
          />
          {digits.length > 0 && (
            <Pressable onPress={handleClear} hitSlop={8} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color="#C0BCC8" />
            </Pressable>
          )}
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.spacer} />

        <Pressable
          style={styles.forgotPassword}
          onPress={() => router.push('/auth/forgot-password' as any)}
        >
          <Text style={styles.forgotPasswordText}>Забыли пароль?</Text>
        </Pressable>

        <Pressable
          style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Войти</Text>
          }
        </Pressable>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },

  back: { marginBottom: 32 },

  title: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'NTSomic-Regular',
    color: '#1C1C1E',
    marginBottom: 28,
  },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    marginBottom: 6,
  },
  inputWrapError: {
    borderColor: '#FF3B30',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'NTSomic-Regular',
    color: '#1C1C1E',
  },
  clearButton: { paddingLeft: 8 },
  errorText: {
    fontSize: 13,
    fontFamily: 'NTSomic-Regular',
    color: '#FF3B30',
    marginBottom: 12,
    marginLeft: 2,
  },

  spacer: { flex: 1 },

  forgotPassword: { alignItems: 'center', paddingVertical: 14 },
  forgotPasswordText: {
    fontSize: 14,
    fontFamily: 'NTSomic-Regular',
    color: '#8E8E93',
  },

  button: {
    height: 56,
    backgroundColor: '#1C1C1E',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { backgroundColor: '#D1D1D6' },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'NTSomic-Regular',
  },
});
