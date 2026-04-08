import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { sendOtp, verifyOtp, useAuth, tokenStorage } from '@beautygo/shared';

const CODE_LENGTH = 6;
const RESEND_TIMEOUT = 60;

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { signIn } = useAuth();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(RESEND_TIMEOUT);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [blocked, setBlocked] = useState(false);

  const MAX_ATTEMPTS = 3;

  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  const handleVerify = useCallback(async (value: string) => {
    if (!phone || loading) return;
    setLoading(true);
    setError('');
    try {
      const deviceId = await tokenStorage.getDeviceId();
      const res = await verifyOtp(phone, value, deviceId);
      const { access, refresh, is_new_user } = res;
      await signIn(access, refresh, is_new_user);
    } catch (err: any) {
      const errorCode = err?.response?.data?.error?.code;
      // Берём remaining_attempts с сервера, или считаем локально
      const serverRemaining = err?.response?.data?.error?.remaining_attempts;

      if (errorCode === 'MAX_ATTEMPTS_EXCEEDED') {
        setBlocked(true);
        setError('Превышено допустимое количество попыток.\nПожалуйста, попробуйте позже');
      } else if (errorCode === 'OTP_EXPIRED') {
        setError('Код истёк. Запросите новый');
      } else if (errorCode === 'RATE_LIMITED') {
        setError('Слишком много попыток. Подождите немного');
      } else if (errorCode === 'INVALID_OTP') {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        if (nextAttempts >= MAX_ATTEMPTS) {
          setBlocked(true);
          setError('Превышено допустимое количество попыток.\nПожалуйста, попробуйте позже');
        } else {
          const remaining = serverRemaining ?? (MAX_ATTEMPTS - nextAttempts);
          const suffix = remaining === 1 ? 'попытка' : 'попытки';
          setError(`Неверный код. У вас осталось ${remaining} ${suffix}`);
        }
      } else {
        setError('Попробуйте ещё раз');
      }
      setCode('');
    } finally {
      setLoading(false);
    }
  }, [phone, signIn, loading]);

  const handleChange = (text: string) => {
    if (blocked) return;
    setError('');
    const clean = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(clean);
    if (clean.length === CODE_LENGTH) {
      handleVerify(clean);
    }
  };

  const handleResend = async () => {
    if (!phone || timer > 0) return;
    try {
      await sendOtp(phone);
      setTimer(RESEND_TIMEOUT);
      setCode('');
      setError('');
      setAttempts(0);
      setBlocked(false);
    } catch {
      setError('Не удалось отправить код');
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

        <Text style={styles.title}>Введите код подтверждения</Text>
        <Text style={styles.subtitle}>
          Введите код из SMS, отправленного на указанный номер,
          чтобы войти в свой аккаунт
        </Text>

        {/* Поле кода */}
        <View style={[styles.inputWrap, error ? styles.inputWrapError : null]}>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={handleChange}
            placeholder="Введите код из SMS"
            placeholderTextColor="#C0BCC8"
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            autoFocus
            editable={!loading && !blocked}
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
          />
          {loading && <ActivityIndicator size="small" color="#C0BCC8" style={styles.spinner} />}
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.spacer} />

        {/* Кнопка повторного запроса */}
        <Pressable
          style={[styles.button, (timer > 0 && !blocked) && styles.buttonDisabled]}
          onPress={handleResend}
          disabled={(timer > 0 && !blocked) || loading}
        >
          <Text style={[styles.buttonText, timer > 0 && styles.buttonTextDisabled]}>
            {blocked || timer <= 0 ? 'Запросить код повторно' : `Запросить через ${formatTimer(timer)}`}
          </Text>
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
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'NTSomic-Regular',
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 32,
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
    letterSpacing: 2,
  },
  spinner: { marginLeft: 8 },
  errorText: {
    fontSize: 13,
    fontFamily: 'NTSomic-Regular',
    color: '#FF3B30',
    marginBottom: 12,
    marginLeft: 2,
    lineHeight: 18,
  },

  spacer: { flex: 1 },

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
  buttonTextDisabled: {
    color: '#8E8E93',
  },
});
