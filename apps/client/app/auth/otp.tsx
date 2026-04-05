import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { sendOtp, verifyOtp, useAuth, tokenStorage } from '@beautygo/shared';

const RESEND_TIMEOUT = 28;

export default function OtpScreen() {
  const { phone, mode } = useLocalSearchParams<{ phone: string; mode?: string }>();
  const isRegister = mode === 'register';
  const { signIn } = useAuth();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [timer, setTimer] = useState(RESEND_TIMEOUT);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  const pad = (n: number) => String(n).padStart(2, '0');

  const handleVerify = useCallback(async (value: string) => {
    if (!phone || value.length < 6) return;
    setLoading(true);
    setError('');
    try {
      const deviceId = await tokenStorage.getDeviceId();
      const res = await verifyOtp(phone, value, deviceId);
      const { access, refresh, is_new_user } = res;
      await signIn(access, refresh, is_new_user);
    } catch (err: any) {
      const c = err?.response?.data?.error?.code;
      const attempts = err?.response?.data?.error?.attempts_left;
      if (c === 'INVALID_OTP') {
        setError(attempts != null
          ? `Неверный код. У вас осталось ${attempts} ${attempts === 1 ? 'попытка' : 'попытки'}`
          : 'Неверный код');
      } else if (c === 'OTP_EXPIRED') {
        setError('Код истёк. Запросите новый');
      } else if (c === 'MAX_ATTEMPTS_EXCEEDED') {
        setError('Превышено допустимое количество попыток.\nПожалуйста, попробуйте позже');
        setBlocked(true);
      } else if (c === 'RATE_LIMITED') {
        setError('Слишком много попыток. Подождите немного');
      } else {
        setError('Попробуйте ещё раз');
      }
      setCode('');
    } finally {
      setLoading(false);
    }
  }, [phone, signIn]);

  const handleChange = (text: string) => {
    const clean = text.replace(/\D/g, '').slice(0, 6);
    setCode(clean);
    setError('');
    if (clean.length === 6) handleVerify(clean);
  };

  const handleResend = async () => {
    if (!phone || timer > 0 || blocked) return;
    try {
      await sendOtp(phone);
      setTimer(RESEND_TIMEOUT);
      setCode('');
      setError('');
      setBlocked(false);
    } catch {
      setError('Не удалось отправить код');
    }
  };

  return (
    <KeyboardAvoidingView style={S.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={S.inner}>

        <Pressable style={S.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
        </Pressable>

        <Text style={S.title}>
          {isRegister ? 'Подтверждение регистрации' : 'Введите код подтверждения'}
        </Text>
        <Text style={S.subtitle}>
          {isRegister
            ? 'Введите код из SMS, отправленного на указанный номер, чтобы подтвердить регистрацию нового аккаунта'
            : 'Введите код из SMS, отправленного на указанный номер, чтобы войти в свой аккаунт'}
        </Text>

        <View style={[S.inputWrap, !!error && S.inputWrapError]}>
          <TextInput
            style={S.input}
            value={code}
            onChangeText={handleChange}
            placeholder="Введите код из SMS"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            autoFocus
            editable={!loading && !blocked}
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={6}
          />
          {loading && <ActivityIndicator color="#9CA3AF" size="small" />}
        </View>

        {!!error && <Text style={S.errorText}>{error}</Text>}

      </View>

      {/* Sticky кнопка внизу */}
      <View style={S.bottomBar}>
        {timer > 0 || blocked ? (
          <View style={S.timerBtn}>
            <Text style={S.timerText}>
              {blocked ? 'Запросить код повторно' : `Запросить через ${pad(Math.floor(timer / 60))}:${pad(timer % 60)}`}
            </Text>
          </View>
        ) : (
          <Pressable style={S.btn} onPress={handleResend}>
            <Text style={S.btnText}>Запросить код повторно</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, paddingHorizontal: 20, paddingTop: 56 },

  back: { marginBottom: 28 },

  title: { fontSize: 24, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  subtitle: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 28 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    height: 52, borderWidth: 1, borderColor: '#E5E5E5',
    borderRadius: 12, paddingHorizontal: 14, backgroundColor: '#fff',
  },
  inputWrapError: { borderColor: '#E53935' },
  input: { flex: 1, fontSize: 18, color: '#1A1A1A', letterSpacing: 2 },
  errorText: { fontSize: 13, color: '#E53935', marginTop: 6, lineHeight: 18 },

  bottomBar: { paddingHorizontal: 20, paddingBottom: 40 },
  btn: {
    height: 52, borderRadius: 999, backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center',
  },
  btnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  timerBtn: {
    height: 52, borderRadius: 999, backgroundColor: '#E5E5E5',
    alignItems: 'center', justifyContent: 'center',
  },
  timerText: { fontSize: 15, color: '#9CA3AF' },
});
