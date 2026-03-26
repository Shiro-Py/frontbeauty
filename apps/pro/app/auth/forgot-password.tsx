import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { sendOtp, verifyOtp, useAuth, tokenStorage } from '@beautygo/shared';

// ─── Утилиты форматирования телефона ────────────────────────────────────────

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

// ─── Константы ───────────────────────────────────────────────────────────────

const CODE_LENGTH = 6;
const RESEND_TIMEOUT = 60;

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ─── Экран ───────────────────────────────────────────────────────────────────

type Step = 'phone' | 'otp';

export default function ForgotPasswordScreen() {
  const { signIn } = useAuth();

  const [step, setStep] = useState<Step>('phone');

  // Шаг 1: телефон
  const [digits, setDigits] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneSending, setPhoneSending] = useState(false);

  // Шаг 2: OTP
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [timer, setTimer] = useState(RESEND_TIMEOUT);
  const [attempts, setAttempts] = useState(0);
  const [blocked, setBlocked] = useState(false);

  const MAX_ATTEMPTS = 3;

  // Таймер повторной отправки
  useEffect(() => {
    if (step !== 'otp' || timer <= 0) return;
    const id = setTimeout(() => setTimer(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [step, timer]);

  // ─── Шаг 1: отправить OTP ──────────────────────────────────────────────────

  const handleSendCode = async () => {
    if (digits.length !== 10 || phoneSending) return;
    const fullPhone = '+7' + digits;
    setPhoneSending(true);
    setPhoneError('');
    try {
      await sendOtp(fullPhone);
      setPhone(fullPhone);
      setTimer(RESEND_TIMEOUT);
      setStep('otp');
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      if (code === 'RATE_LIMITED') {
        setPhoneError('Слишком много запросов. Попробуйте через минуту');
      } else if (code === 'INVALID_PHONE') {
        setPhoneError('Некорректный номер телефона');
      } else {
        setPhoneError('Не удалось отправить код. Попробуйте ещё раз');
      }
    } finally {
      setPhoneSending(false);
    }
  };

  // ─── Шаг 2: проверить OTP ─────────────────────────────────────────────────

  const handleVerify = useCallback(async (value: string) => {
    if (!phone || otpLoading) return;
    setOtpLoading(true);
    setOtpError('');
    try {
      const deviceId = await tokenStorage.getDeviceId();
      const res = await verifyOtp(phone, value, deviceId);
      const { access, refresh, is_new_user } = res.data;
      await signIn(access, refresh, is_new_user);
      // authStore автоматически редиректит на (tabs) или onboarding
    } catch (err: any) {
      const errorCode = err?.response?.data?.error?.code;
      const serverRemaining = err?.response?.data?.error?.remaining_attempts;

      if (errorCode === 'MAX_ATTEMPTS_EXCEEDED') {
        setBlocked(true);
        setOtpError('Превышено допустимое количество попыток.\nПожалуйста, запросите новый код');
      } else if (errorCode === 'OTP_EXPIRED') {
        setOtpError('Код истёк. Запросите новый');
      } else if (errorCode === 'RATE_LIMITED') {
        setOtpError('Слишком много попыток. Подождите немного');
      } else if (errorCode === 'INVALID_OTP') {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        if (nextAttempts >= MAX_ATTEMPTS) {
          setBlocked(true);
          setOtpError('Превышено допустимое количество попыток.\nПожалуйста, запросите новый код');
        } else {
          const remaining = serverRemaining ?? (MAX_ATTEMPTS - nextAttempts);
          const suffix = remaining === 1 ? 'попытка' : 'попытки';
          setOtpError(`Неверный код. У вас осталось ${remaining} ${suffix}`);
        }
      } else {
        setOtpError('Попробуйте ещё раз');
      }
      setCode('');
    } finally {
      setOtpLoading(false);
    }
  }, [phone, signIn, otpLoading, attempts]);

  const handleCodeChange = (text: string) => {
    if (blocked) return;
    setOtpError('');
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
      setOtpError('');
      setAttempts(0);
      setBlocked(false);
    } catch {
      setOtpError('Не удалось отправить код');
    }
  };

  // ─── Рендер ───────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>

        <Pressable
          style={styles.back}
          onPress={() => step === 'otp' ? setStep('phone') : router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="#1C1C1E" />
        </Pressable>

        {/* ── ШАГ 1: Ввод телефона ── */}
        {step === 'phone' && (
          <>
            <Text style={styles.title}>Восстановление доступа</Text>
            <Text style={styles.subtitle}>
              Введите номер телефона, привязанный к вашему аккаунту.
              Мы отправим SMS-код для входа.
            </Text>

            <View style={[styles.inputWrap, phoneError ? styles.inputWrapError : null]}>
              <TextInput
                style={styles.input}
                value={formatPhone(digits)}
                onChangeText={(text) => {
                  const d = extractDigits(text);
                  setDigits(d);
                  if (d.length > 0 && d.length < 10) {
                    setPhoneError('Некорректный номер телефона');
                  } else {
                    setPhoneError('');
                  }
                }}
                placeholder="Номер телефона"
                placeholderTextColor="#C0BCC8"
                keyboardType="phone-pad"
                autoFocus
                editable={!phoneSending}
                textContentType="telephoneNumber"
                autoComplete="tel"
              />
              {digits.length > 0 && (
                <Pressable
                  onPress={() => { setDigits(''); setPhoneError(''); }}
                  hitSlop={8}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={18} color="#C0BCC8" />
                </Pressable>
              )}
            </View>
            {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}

            <View style={styles.spacer} />

            <Pressable
              style={[styles.button, (digits.length !== 10 || phoneSending) && styles.buttonDisabled]}
              onPress={handleSendCode}
              disabled={digits.length !== 10 || phoneSending}
            >
              {phoneSending
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>Получить код</Text>
              }
            </Pressable>
          </>
        )}

        {/* ── ШАГ 2: Ввод OTP-кода ── */}
        {step === 'otp' && (
          <>
            <Text style={styles.title}>Введите код подтверждения</Text>
            <Text style={styles.subtitle}>
              Мы отправили SMS на номер{' '}
              <Text style={styles.phoneHighlight}>{phone}</Text>.
              {'\n'}Введите код для восстановления доступа.
            </Text>

            <View style={[styles.inputWrap, otpError ? styles.inputWrapError : null]}>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={handleCodeChange}
                placeholder="Введите код из SMS"
                placeholderTextColor="#C0BCC8"
                keyboardType="number-pad"
                maxLength={CODE_LENGTH}
                autoFocus
                editable={!otpLoading && !blocked}
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
              />
              {otpLoading && (
                <ActivityIndicator size="small" color="#C0BCC8" style={styles.spinner} />
              )}
            </View>
            {otpError ? (
              <Text style={styles.errorText}>{otpError}</Text>
            ) : null}

            <View style={styles.spacer} />

            <Pressable
              style={[styles.button, (timer > 0 && !blocked) && styles.buttonDisabled]}
              onPress={handleResend}
              disabled={(timer > 0 && !blocked) || otpLoading}
            >
              <Text style={[styles.buttonText, timer > 0 && !blocked && styles.buttonTextDisabled]}>
                {blocked || timer <= 0
                  ? 'Запросить код повторно'
                  : `Запросить через ${formatTimer(timer)}`}
              </Text>
            </Pressable>
          </>
        )}

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
  phoneHighlight: {
    fontWeight: '600',
    color: '#1C1C1E',
    fontFamily: 'NTSomic-Regular',
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
  inputWrapError: { borderColor: '#FF3B30' },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'NTSomic-Regular',
    color: '#1C1C1E',
    letterSpacing: 1,
  },
  clearButton: { paddingLeft: 8 },
  spinner: { marginLeft: 8 },
  errorText: {
    fontSize: 13,
    fontFamily: 'NTSomic-Regular',
    color: '#FF3B30',
    marginBottom: 8,
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
  buttonTextDisabled: { color: '#8E8E93' },
});
