import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { sendOtp, verifyOtp, useAuth, tokenStorage, updateClientProfile } from '@beautygo/shared';
import { onboardingStorage } from '../../utils/onboardingStorage';

export type GateTrigger = 'booking' | 'review' | 'favorite';

type Step = 'gate' | 'phone' | 'otp' | 'name' | 'geo' | 'done';

interface Props {
  visible: boolean;
  trigger: GateTrigger;
  onClose: () => void;
}

const SHEET_HEIGHT = Dimensions.get('window').height * 0.85;
const RESEND_TIMEOUT = 28;

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

function triggerLabel(trigger: GateTrigger): string {
  if (trigger === 'booking') return 'Войдите, чтобы записаться к мастеру';
  if (trigger === 'review') return 'Войдите, чтобы оставить отзыв';
  return 'Войдите, чтобы добавить в избранное';
}

export default function GateBottomSheet({ visible, trigger, onClose }: Props) {
  const { signIn } = useAuth();

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  const [step, setStep] = useState<Step>('gate');

  // Phone step
  const [digits, setDigits] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // OTP step
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpBlocked, setOtpBlocked] = useState(false);
  const [timer, setTimer] = useState(RESEND_TIMEOUT);
  const [isNewUser, setIsNewUser] = useState(false);
  const [anonToken, setAnonToken] = useState<string | null>(null);

  // Name step
  const [name, setName] = useState('');

  // Loading
  const [loading, setLoading] = useState(false);

  // Timer for OTP resend
  useEffect(() => {
    if (step !== 'otp' || timer <= 0) return;
    const id = setTimeout(() => setTimer(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [step, timer]);

  // Animation
  useEffect(() => {
    if (visible) {
      // Reset to gate step each time sheet opens
      setStep('gate');
      resetPhoneState();
      resetOtpState();
      setName('');
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 260,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  function resetPhoneState() {
    setDigits('');
    setPhoneError('');
  }

  function resetOtpState() {
    setCode('');
    setOtpError('');
    setOtpBlocked(false);
    setTimer(RESEND_TIMEOUT);
  }

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: SHEET_HEIGHT,
      duration: 260,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  // ── Phone step ────────────────────────────────────────────────────────────────

  const phoneValid = digits.length === 10;

  const handlePhoneChange = (text: string) => {
    const d = extractDigits(text);
    setDigits(d);
    setPhoneError(d.length > 0 && d.length < 10 ? 'Некорректный номер' : '');
  };

  const handlePhoneSubmit = async () => {
    if (!phoneValid || loading) return;
    setLoading(true);
    setPhoneError('');
    try {
      await sendOtp('+7' + digits);
      setPhone('+7' + digits);
      resetOtpState();
      setStep('otp');
    } catch (err: any) {
      const c = err?.response?.data?.error?.code;
      if (c === 'RATE_LIMITED') setPhoneError('Слишком много запросов. Подождите минуту.');
      else if (c === 'INVALID_PHONE') setPhoneError('Некорректный номер телефона');
      else setPhoneError('Не удалось отправить код. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP step ──────────────────────────────────────────────────────────────────

  const handleVerify = useCallback(async (value: string) => {
    if (!phone || value.length < 6) return;
    setLoading(true);
    setOtpError('');
    try {
      const anon = await tokenStorage.getAnonymous();
      setAnonToken(anon);
      const deviceId = await tokenStorage.getDeviceId();
      const res = await verifyOtp(phone, value, deviceId, anon ?? undefined);
      setIsNewUser(res.is_new_user);
      if (res.is_new_user) {
        // Save tokens temporarily — signIn called after name/geo steps
        await tokenStorage.save(res.access, res.refresh);
        await tokenStorage.clearAnonymous();
        await onboardingStorage.set('otp_verified');
        setStep('name');
      } else {
        await signIn(res.access, res.refresh, false, res.user ?? null);
        await onboardingStorage.set('completed');
        setStep('done');
      }
    } catch (err: any) {
      const c = err?.response?.data?.error?.code;
      const attempts = err?.response?.data?.error?.attempts_left;
      if (c === 'INVALID_OTP') {
        setOtpError(attempts != null
          ? `Неверный код. Осталось ${attempts} ${attempts === 1 ? 'попытка' : 'попытки'}`
          : 'Неверный код');
      } else if (c === 'OTP_EXPIRED') {
        setOtpError('Код истёк. Запросите новый');
      } else if (c === 'MAX_ATTEMPTS_EXCEEDED') {
        setOtpError('Превышено количество попыток. Попробуйте позже');
        setOtpBlocked(true);
      } else {
        setOtpError('Попробуйте ещё раз');
      }
      setCode('');
    } finally {
      setLoading(false);
    }
  }, [phone, signIn]);

  const handleCodeChange = (text: string) => {
    const clean = text.replace(/\D/g, '').slice(0, 6);
    setCode(clean);
    setOtpError('');
    if (clean.length === 6) handleVerify(clean);
  };

  const handleResend = async () => {
    if (!phone || timer > 0 || otpBlocked) return;
    try {
      await sendOtp(phone);
      setTimer(RESEND_TIMEOUT);
      setCode('');
      setOtpError('');
      setOtpBlocked(false);
    } catch {
      setOtpError('Не удалось отправить код');
    }
  };

  // ── Name step ─────────────────────────────────────────────────────────────────

  const nameValid = name.trim().length >= 2;

  const handleNameSubmit = async () => {
    if (!nameValid || loading) return;
    setLoading(true);
    try {
      await updateClientProfile({ first_name: name.trim() });
      await onboardingStorage.set('name_done');
    } catch { /* non-critical */ }
    setLoading(false);
    setStep('geo');
  };

  // ── Geo step ──────────────────────────────────────────────────────────────────

  const handleGeoRequest = async () => {
    setLoading(true);
    try {
      await Location.requestForegroundPermissionsAsync();
      await onboardingStorage.set('geo_done');
    } catch { /* non-critical */ }
    setLoading(false);
    await finishOnboarding();
  };

  const handleGeoSkip = async () => {
    await onboardingStorage.set('geo_done');
    await finishOnboarding();
  };

  const finishOnboarding = async () => {
    try {
      const access = await tokenStorage.getAccess();
      const refresh = await tokenStorage.getRefresh();
      if (access && refresh) {
        await signIn(access, refresh, false);
        await onboardingStorage.set('completed');
      }
    } catch { /* non-critical */ }
    setStep('done');
  };

  // ── Done step ─────────────────────────────────────────────────────────────────

  const handleDone = () => handleClose();

  // ── Back navigation ───────────────────────────────────────────────────────────

  const handleBack = () => {
    if (step === 'phone') setStep('gate');
    else if (step === 'otp') { resetOtpState(); setStep('phone'); }
    else if (step === 'name') setStep('otp');
  };

  const pad = (n: number) => String(n).padStart(2, '0');
  const canGoBack = step === 'phone' || step === 'otp' || step === 'name';

  // ── Render ────────────────────────────────────────────────────────────────────

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={handleClose}>
      {/* Backdrop */}
      <Pressable style={S.backdrop} onPress={handleClose} />

      <Animated.View style={[S.sheet, { transform: [{ translateY }] }]}>
        {/* Handle */}
        <View style={S.handle} />

        {/* Header row */}
        <View style={S.headerRow}>
          {canGoBack ? (
            <Pressable onPress={handleBack} hitSlop={12} style={S.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
            </Pressable>
          ) : (
            <View style={S.backBtn} />
          )}
          <Pressable onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={22} color="#9CA3AF" />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={S.content}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {step === 'gate' && (
            <GateStep trigger={trigger} onLogin={() => setStep('phone')} onClose={handleClose} />
          )}
          {step === 'phone' && (
            <PhoneStep
              digits={digits}
              error={phoneError}
              loading={loading}
              onChangeText={handlePhoneChange}
              onSubmit={handlePhoneSubmit}
              phoneValid={phoneValid}
            />
          )}
          {step === 'otp' && (
            <OtpStep
              phone={phone}
              code={code}
              error={otpError}
              blocked={otpBlocked}
              loading={loading}
              timer={timer}
              pad={pad}
              onChangeText={handleCodeChange}
              onResend={handleResend}
            />
          )}
          {step === 'name' && (
            <NameStep
              name={name}
              onChangeName={setName}
              nameValid={nameValid}
              loading={loading}
              onSubmit={handleNameSubmit}
            />
          )}
          {step === 'geo' && (
            <GeoStep loading={loading} onRequest={handleGeoRequest} onSkip={handleGeoSkip} />
          )}
          {step === 'done' && (
            <DoneStep onDone={handleDone} />
          )}
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

// ── Sub-screens ───────────────────────────────────────────────────────────────

function GateStep({ trigger, onLogin, onClose }: { trigger: GateTrigger; onLogin: () => void; onClose: () => void }) {
  return (
    <View style={S.stepWrap}>
      <View style={S.gateIconWrap}>
        <Ionicons
          name={trigger === 'booking' ? 'calendar-outline' : trigger === 'review' ? 'star-outline' : 'heart-outline'}
          size={48}
          color="#7B61FF"
        />
      </View>
      <Text style={S.gateTitle}>{triggerLabel(trigger)}</Text>
      <Text style={S.gateSub}>Создайте аккаунт или войдите — это займёт меньше минуты</Text>
      <View style={S.gateButtons}>
        <Pressable style={S.btn} onPress={onLogin}>
          <Text style={S.btnText}>Войти / Зарегистрироваться</Text>
        </Pressable>
        <Pressable style={S.btnOutline} onPress={onClose}>
          <Text style={S.btnOutlineText}>Продолжить без входа</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PhoneStep({ digits, error, loading, onChangeText, onSubmit, phoneValid }: {
  digits: string; error: string; loading: boolean;
  onChangeText: (t: string) => void; onSubmit: () => void; phoneValid: boolean;
}) {
  return (
    <View style={S.stepWrap}>
      <Text style={S.stepTitle}>Введите номер телефона</Text>
      <View style={[S.inputWrap, !!error && S.inputWrapError]}>
        <TextInput
          style={S.input}
          value={digits.length ? formatPhone(digits) : ''}
          onChangeText={onChangeText}
          placeholder="Номер телефона"
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
          autoFocus
          editable={!loading}
          textContentType="telephoneNumber"
          autoComplete="tel"
        />
        {digits.length > 0 && !loading && (
          <Pressable onPress={() => onChangeText('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </Pressable>
        )}
      </View>
      {!!error && <Text style={S.errorText}>{error}</Text>}
      <View style={S.bottomBtn}>
        <Pressable
          style={[S.btn, (!phoneValid || loading) && S.btnDisabled]}
          onPress={onSubmit}
          disabled={!phoneValid || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={[S.btnText, (!phoneValid || loading) && S.btnTextDisabled]}>Продолжить</Text>
          }
        </Pressable>
      </View>
    </View>
  );
}

function OtpStep({ phone, code, error, blocked, loading, timer, pad, onChangeText, onResend }: {
  phone: string; code: string; error: string; blocked: boolean; loading: boolean;
  timer: number; pad: (n: number) => string;
  onChangeText: (t: string) => void; onResend: () => void;
}) {
  return (
    <View style={S.stepWrap}>
      <Text style={S.stepTitle}>Введите код из SMS</Text>
      <Text style={S.stepSub}>Отправили код на {phone}</Text>
      <View style={[S.inputWrap, !!error && S.inputWrapError]}>
        <TextInput
          style={[S.input, { letterSpacing: 4, fontSize: 20 }]}
          value={code}
          onChangeText={onChangeText}
          placeholder="______"
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
      <View style={S.bottomBtn}>
        {timer > 0 || blocked ? (
          <View style={S.timerBtn}>
            <Text style={S.timerText}>
              {blocked ? 'Запросить код повторно' : `Запросить через ${pad(Math.floor(timer / 60))}:${pad(timer % 60)}`}
            </Text>
          </View>
        ) : (
          <Pressable style={S.btnOutline} onPress={onResend}>
            <Text style={S.btnOutlineText}>Запросить код повторно</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function NameStep({ name, onChangeName, nameValid, loading, onSubmit }: {
  name: string; onChangeName: (v: string) => void; nameValid: boolean;
  loading: boolean; onSubmit: () => void;
}) {
  return (
    <View style={S.stepWrap}>
      <Text style={S.stepTitle}>Как вас зовут?</Text>
      <Text style={S.stepSub}>Укажите имя, чтобы мастера знали, как к вам обращаться</Text>
      <View style={S.inputWrap}>
        <TextInput
          style={S.input}
          value={name}
          onChangeText={onChangeName}
          placeholder="Ваше имя"
          placeholderTextColor="#9CA3AF"
          autoFocus
          autoCapitalize="words"
          editable={!loading}
        />
      </View>
      <View style={S.bottomBtn}>
        <Pressable
          style={[S.btn, (!nameValid || loading) && S.btnDisabled]}
          onPress={onSubmit}
          disabled={!nameValid || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={[S.btnText, (!nameValid || loading) && S.btnTextDisabled]}>Продолжить</Text>
          }
        </Pressable>
      </View>
    </View>
  );
}

function GeoStep({ loading, onRequest, onSkip }: {
  loading: boolean; onRequest: () => void; onSkip: () => void;
}) {
  return (
    <View style={S.stepWrap}>
      <View style={S.gateIconWrap}>
        <Ionicons name="location-outline" size={48} color="#7B61FF" />
      </View>
      <Text style={S.stepTitle}>Разрешить геолокацию?</Text>
      <Text style={S.stepSub}>Это поможет найти мастеров рядом с вами</Text>
      <View style={S.gateButtons}>
        <Pressable style={[S.btn, loading && S.btnDisabled]} onPress={onRequest} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={S.btnText}>Разрешить</Text>
          }
        </Pressable>
        <Pressable style={S.btnOutline} onPress={onSkip} disabled={loading}>
          <Text style={S.btnOutlineText}>Пропустить</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DoneStep({ onDone }: { onDone: () => void }) {
  return (
    <View style={[S.stepWrap, { alignItems: 'center' }]}>
      <View style={S.doneCircle}>
        <Ionicons name="checkmark" size={48} color="#fff" />
      </View>
      <Text style={S.stepTitle}>Готово!</Text>
      <Text style={S.stepSub}>Аккаунт создан. Теперь вы можете записываться к мастерам и управлять бронированиями.</Text>
      <View style={[S.bottomBtn, { width: '100%' }]}>
        <Pressable style={S.btn} onPress={onDone}>
          <Text style={S.btnText}>Начать</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E5E5',
    alignSelf: 'center', marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 8,
  },
  backBtn: { width: 32, height: 32, alignItems: 'flex-start', justifyContent: 'center' },
  content: { flex: 1 },

  stepWrap: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },

  gateIconWrap: { alignItems: 'center', marginBottom: 20, marginTop: 8 },
  gateTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', textAlign: 'center', marginBottom: 8 },
  gateSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 32 },
  gateButtons: { gap: 12 },

  stepTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  stepSub: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 24 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    height: 52, borderWidth: 1, borderColor: '#E5E5E5',
    borderRadius: 12, paddingHorizontal: 14, backgroundColor: '#fff',
    marginBottom: 8,
  },
  inputWrapError: { borderColor: '#E53935' },
  input: { flex: 1, fontSize: 16, color: '#1A1A1A' },
  errorText: { fontSize: 13, color: '#E53935', marginBottom: 8 },

  bottomBtn: { marginTop: 'auto', paddingTop: 16, paddingBottom: 32 },

  btn: {
    height: 52, borderRadius: 999, backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { backgroundColor: '#E5E5E5' },
  btnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  btnTextDisabled: { color: '#9CA3AF' },

  btnOutline: {
    height: 52, borderRadius: 999, borderWidth: 1, borderColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center',
  },
  btnOutlineText: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },

  timerBtn: {
    height: 52, borderRadius: 999, backgroundColor: '#E5E5E5',
    alignItems: 'center', justifyContent: 'center',
  },
  timerText: { fontSize: 15, color: '#9CA3AF' },

  doneCircle: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24, alignSelf: 'center',
  },
});
