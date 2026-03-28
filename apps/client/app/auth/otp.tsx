import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, Alert, NativeSyntheticEvent,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { sendOtp, verifyOtp, useAuth, tokenStorage } from '@beautygo/shared';

const CODE_LENGTH = 6;
const RESEND_TIMEOUT = 30;

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { signIn } = useAuth();

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(RESEND_TIMEOUT);

  const inputRefs = useRef<Array<TextInput | null>>(Array(CODE_LENGTH).fill(null));

  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  useEffect(() => {
    const code = digits.join('');
    if (code.length === CODE_LENGTH && !digits.includes('')) {
      handleVerify(code);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  const handleDigitChange = (text: string, index: number) => {
    // Обработка вставки полного кода (SMS auto-read / paste)
    const clean = text.replace(/\D/g, '');
    if (clean.length >= CODE_LENGTH) {
      const next = clean.slice(0, CODE_LENGTH).split('');
      setDigits(next);
      inputRefs.current[CODE_LENGTH - 1]?.focus();
      return;
    }
    const char = clean.slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (char && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<{ key: string }>,
    index: number,
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = useCallback(
    async (code: string) => {
      if (!phone) return;
      setLoading(true);
      try {
        const deviceId = await tokenStorage.getDeviceId();
        const res = await verifyOtp(phone, code, deviceId);
        const { access, refresh, is_new_user } = res.data;
        await signIn(access, refresh, is_new_user);
      } catch (err: any) {
        const errorCode = err?.response?.data?.error?.code;
        let message = 'Попробуйте ещё раз';
        if (errorCode === 'INVALID_OTP') message = 'Неверный код';
        if (errorCode === 'OTP_EXPIRED') message = 'Код истёк. Запросите новый';
        if (errorCode === 'MAX_ATTEMPTS_EXCEEDED') message = 'Превышено количество попыток. Запросите новый код';
        if (errorCode === 'RATE_LIMITED') message = 'Слишком много попыток. Подождите немного';
        Alert.alert('Ошибка', message);
        setDigits(Array(CODE_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      } finally {
        setLoading(false);
      }
    },
    [phone, signIn],
  );

  const handleResend = async () => {
    if (!phone || timer > 0) return;
    try {
      await sendOtp(phone);
      setTimer(RESEND_TIMEOUT);
      setDigits(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch {
      Alert.alert('Ошибка', 'Не удалось отправить код');
    }
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← Назад</Text>
      </Pressable>
      <Text style={styles.title}>Введите код</Text>
      <Text style={styles.subtitle}>
        Отправили SMS на номер{'\n'}
        <Text style={styles.phone}>{phone}</Text>
      </Text>
      <View style={styles.codeRow}>
        {digits.map((digit, i) => (
          <TextInput
            key={i}
            ref={(ref) => { inputRefs.current[i] = ref; }}
            style={[styles.cell, digit ? styles.cellFilled : null]}
            value={digit}
            onChangeText={(text) => handleDigitChange(text, i)}
            onKeyPress={(e) => handleKeyPress(e, i)}
            keyboardType="number-pad"
            maxLength={i === 0 ? CODE_LENGTH : 1}
            editable={!loading}
            selectTextOnFocus
            autoFocus={i === 0}
            textAlign="center"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
          />
        ))}
      </View>
      {loading && <ActivityIndicator style={styles.loader} color="#7B61FF" size="large" />}
      <Pressable
        style={styles.resendButton}
        onPress={handleResend}
        disabled={timer > 0 || loading}
      >
        {timer > 0
          ? <Text style={styles.timerText}>Отправить снова через <Text style={styles.timerCount}>{timer} с</Text></Text>
          : <Text style={styles.resendText}>Отправить код повторно</Text>
        }
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 24, paddingTop: 60 },
  backButton: { marginBottom: 32 },
  backText: { fontSize: 16, color: '#7B61FF' },
  title: { fontSize: 26, fontWeight: '700', color: '#1A1628', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#7A7286', marginBottom: 40, lineHeight: 22 },
  phone: { color: '#1A1628', fontWeight: '600' },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  cell: {
    width: 48, height: 56, borderWidth: 1.5, borderColor: '#E2DCF0',
    borderRadius: 12, fontSize: 22, fontWeight: '700', color: '#1A1628', backgroundColor: '#FAFAFA',
  },
  cellFilled: { borderColor: '#7B61FF', backgroundColor: '#F3F0FF' },
  loader: { marginBottom: 24 },
  resendButton: { alignItems: 'center', paddingVertical: 12 },
  timerText: { fontSize: 14, color: '#B0A8B9' },
  timerCount: { fontWeight: '600', color: '#7A7286' },
  resendText: { fontSize: 14, color: '#7B61FF', fontWeight: '600' },
});
