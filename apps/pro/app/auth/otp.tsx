import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, Alert, NativeSyntheticEvent, TextInputKeyPressEventData,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { sendOtp, verifyOtp, useAuth } from '@beautygo/shared';

const CODE_LENGTH = 6;
const RESEND_TIMEOUT = 60;

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
    const char = text.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (char && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = useCallback(async (code: string) => {
    if (!phone) return;
    setLoading(true);
    try {
      const res = await verifyOtp(phone, code);
      const { access, refresh, is_new_user } = res.data;
      await signIn(access, refresh, is_new_user);
    } catch (err: any) {
      const errorCode = err?.response?.data?.error?.code;
      let message = 'Попробуйте ещё раз';
      if (errorCode === 'INVALID_CODE') message = 'Неверный код';
      if (errorCode === 'CODE_EXPIRED') message = 'Код истёк. Запросите новый';
      Alert.alert('Ошибка', message);
      setDigits(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [phone, signIn]);

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
      <Text style={styles.subtitle}>Отправили SMS на{'\n'}<Text style={styles.phone}>{phone}</Text></Text>
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
            maxLength={1}
            editable={!loading}
            selectTextOnFocus
            autoFocus={i === 0}
            textAlign="center"
          />
        ))}
      </View>
      {loading && <ActivityIndicator style={{ marginBottom: 24 }} color="#4A3DB0" size="large" />}
      <Pressable style={styles.resendButton} onPress={handleResend} disabled={timer > 0 || loading}>
        {timer > 0
          ? <Text style={styles.timerText}>Отправить снова через <Text style={{ fontWeight: '600' }}>{timer} с</Text></Text>
          : <Text style={styles.resendText}>Отправить код повторно</Text>
        }
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7FF', paddingHorizontal: 24, paddingTop: 60 },
  backButton: { marginBottom: 32 },
  backText: { fontSize: 16, color: '#4A3DB0' },
  title: { fontSize: 26, fontWeight: '700', color: '#1A1628', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#7A7286', marginBottom: 40, lineHeight: 22 },
  phone: { color: '#1A1628', fontWeight: '600' },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  cell: {
    width: 48, height: 56, borderWidth: 1.5, borderColor: '#C8C2E8',
    borderRadius: 12, fontSize: 22, fontWeight: '700', color: '#1A1628', backgroundColor: '#fff',
  },
  cellFilled: { borderColor: '#4A3DB0', backgroundColor: '#EEEAFF' },
  resendButton: { alignItems: 'center', paddingVertical: 12 },
  timerText: { fontSize: 14, color: '#B0A8B9' },
  resendText: { fontSize: 14, color: '#4A3DB0', fontWeight: '600' },
});
