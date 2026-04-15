import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Linking, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View, ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  getProAppointmentById, completeAppointment, cancelAppointmentWithReason,
  ProAppointment, BookingStatus,
} from '@ayla/shared';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string }> = {
  pending:          { label: 'Ждёт подтверждения', color: '#F59E0B' },
  awaiting_payment: { label: 'Ждёт оплаты',         color: '#EAB308' },
  confirmed:        { label: 'Подтверждена',         color: '#22C55E' },
  in_progress:      { label: 'В процессе',           color: '#3B82F6' },
  completed:        { label: 'Завершена',             color: '#6B7280' },
  cancelled:        { label: 'Отменена',              color: '#EF4444' },
  no_show:          { label: 'Клиент не пришёл',      color: '#374151' },
};

const TERMINAL: BookingStatus[] = ['completed', 'cancelled', 'no_show'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function localDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' });
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${date}, ${time}`;
}
function localTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function canComplete(appt: ProAppointment): boolean {
  if (appt.status !== 'confirmed' && appt.status !== 'in_progress') return false;
  return new Date(appt.end_datetime) <= new Date();
}
function canCancel(appt: ProAppointment): boolean {
  return !TERMINAL.includes(appt.status);
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function useToast() {
  const opacity = useRef(new Animated.Value(0)).current;
  const [msg, setMsg] = useState('');
  const show = useCallback((message: string) => {
    setMsg(message);
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);
  const Toast = (
    <Animated.View style={[S.toast, { opacity }]} pointerEvents="none">
      <Ionicons name="checkmark-circle" size={16} color="#fff" />
      <Text style={S.toastText}>{msg}</Text>
    </Animated.View>
  );
  return { show, Toast };
}

// ─── Cancel bottom sheet ──────────────────────────────────────────────────────

const SHEET_HEIGHT = 440;

interface CancelSheetProps {
  appt: ProAppointment;
  visible: boolean;
  onClose: () => void;
  onCancelled: () => void;
}

function CancelSheet({ appt, visible, onClose, onCancelled }: CancelSheetProps) {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setReason('');
      setError(null);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 3 }).start();
    } else {
      Animated.timing(translateY, { toValue: SHEET_HEIGHT, duration: 240, useNativeDriver: true }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(translateY, { toValue: SHEET_HEIGHT, duration: 240, useNativeDriver: true })
      .start(() => onClose());
  };

  const handleCancel = async () => {
    if (!reason.trim()) { setError('Укажи причину отмены'); return; }
    setLoading(true);
    setError(null);
    try {
      await cancelAppointmentWithReason(appt.id, reason.trim());
      onCancelled();
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 403) setError('Нельзя отменить чужую запись');
      else setError('Не удалось отменить. Попробуй ещё раз');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={handleClose}>
      <Pressable style={S.sheetBackdrop} onPress={handleClose} />
      <Animated.View style={[S.sheet, { transform: [{ translateY }] }]}>
        <View style={S.sheetHandle} />
        <View style={S.sheetHeader}>
          <Text style={S.sheetTitle}>Отменить запись?</Text>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={22} color="#6B7280" />
          </Pressable>
        </View>

        <ScrollView style={S.sheetBody} showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Summary */}
          <Text style={S.cancelSummary}>
            {appt.client_name} · {appt.service_name} · {localTime(appt.start_datetime)}
          </Text>

          {/* Policy */}
          <View style={S.policyBox}>
            <View style={S.policyRow}>
              <Ionicons name="warning-outline" size={16} color="#F59E0B" />
              <Text style={S.policyTitle}>Политика отмены</Text>
            </View>
            <Text style={S.policyLine}>• 24+ часа до записи — бесплатно</Text>
            <Text style={S.policyLine}>• 2–24 часа — комиссия 50%</Text>
            <Text style={S.policyLine}>• &lt;2 часов — комиссия 100%</Text>
          </View>

          {/* Reason */}
          <Text style={S.reasonLabel}>Причина (обязательно)</Text>
          <TextInput
            style={[S.reasonInput, !!error && S.reasonInputError]}
            value={reason}
            onChangeText={v => { setReason(v); setError(null); }}
            placeholder="Опишите причину отмены…"
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={300}
            editable={!loading}
          />
          {error && <Text style={S.sheetError}>{error}</Text>}
        </ScrollView>

        <View style={S.sheetActions}>
          <Pressable
            style={[S.cancelConfirmBtn, loading && S.btnDisabled]}
            onPress={handleCancel}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={S.cancelConfirmText}>Отменить запись</Text>
            }
          </Pressable>
          <Pressable style={S.keepBtn} onPress={handleClose} disabled={loading}>
            <Text style={S.keepBtnText}>Не отменять</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ icon, children }: { icon: React.ComponentProps<typeof Ionicons>['name']; children: React.ReactNode }) {
  return (
    <View style={S.infoRow}>
      <Ionicons name={icon} size={18} color="#6B7280" style={{ width: 24 }} />
      <View style={S.infoContent}>{children}</View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [appt, setAppt] = useState<ProAppointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const { show: showToast, Toast } = useToast();

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getProAppointmentById(id);
      setAppt(data);
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить запись');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleComplete = async () => {
    if (!appt) return;
    setActing(true);
    try {
      await completeAppointment(appt.id);
      setAppt(a => a ? { ...a, status: 'completed' } : a);
      showToast('Запись завершена. Ожидается оплата');
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 409) showToast('Запись нельзя завершить в текущем статусе');
      else showToast('Не удалось завершить. Попробуй ещё раз');
    } finally {
      setActing(false);
    }
  };

  const handleCancelled = () => {
    setCancelOpen(false);
    setAppt(a => a ? { ...a, status: 'cancelled' } : a);
    showToast('Запись отменена');
  };

  if (loading) {
    return (
      <View style={S.root}>
        <View style={S.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="chevron-back" size={22} color="#1A1628" /></Pressable>
        </View>
        <ActivityIndicator style={{ marginTop: 60 }} color="#4A3DB0" />
      </View>
    );
  }

  if (!appt) return null;

  const cfg = STATUS_CONFIG[appt.status];
  const dateLabel = localDateTime(appt.start_datetime);
  const endLabel  = localTime(appt.end_datetime);
  const completable = canComplete(appt);
  const cancellable = canCancel(appt);

  return (
    <View style={S.root}>
      {Toast}

      {/* Top bar */}
      <View style={S.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color="#1A1628" />
        </Pressable>
        <Text style={S.topBarTitle}>Запись</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={S.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Client */}
        <View style={S.clientBlock}>
          <View style={S.clientAvatar}>
            <Text style={S.clientAvatarText}>{appt.client_name[0]}</Text>
          </View>
          <View style={S.clientMeta}>
            <Text style={S.clientName}>{appt.client_name}</Text>
            {appt.client_phone ? (
              <Pressable onPress={() => Linking.openURL(`tel:${appt.client_phone}`)}>
                <Text style={S.clientPhone}>{appt.client_phone}  📞</Text>
              </Pressable>
            ) : (
              <Text style={S.noPhone}>Телефон не указан</Text>
            )}
          </View>
        </View>

        <View style={S.divider} />

        {/* Details */}
        <InfoRow icon="calendar-outline">
          <Text style={S.infoMain}>{dateLabel} – {endLabel}</Text>
        </InfoRow>
        <InfoRow icon="cut-outline">
          <Text style={S.infoMain}>{appt.service_name}</Text>
        </InfoRow>
        <InfoRow icon="cash-outline">
          <Text style={S.infoMain}>{appt.price.toLocaleString('ru-RU')} ₽</Text>
          {appt.payment_method === 'online' && (
            <Text style={S.infoSub}>Оплачено онлайн</Text>
          )}
          {appt.payment_method === 'cash' && (
            <Text style={S.infoSub}>Оплата наличными</Text>
          )}
        </InfoRow>

        <View style={S.divider} />

        {/* Status */}
        <View style={S.statusRow}>
          <Text style={S.statusLabel}>Статус</Text>
          <Text style={[S.statusValue, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </ScrollView>

      {/* Actions */}
      {(completable || cancellable) && (
        <View style={S.actions}>
          {completable && (
            <Pressable
              style={[S.completeBtn, acting && S.btnDisabled]}
              onPress={handleComplete}
              disabled={acting}
            >
              {acting
                ? <ActivityIndicator color="#fff" />
                : <Text style={S.completeBtnText}>Завершить</Text>
              }
            </Pressable>
          )}
          {/* Complete button disabled state when time hasn't passed */}
          {!completable && (appt.status === 'confirmed' || appt.status === 'in_progress') && (
            <View style={[S.completeBtn, S.btnDisabled]}>
              <Text style={S.completeBtnText}>Завершить — доступно после {localTime(appt.end_datetime)}</Text>
            </View>
          )}
          {cancellable && (
            <Pressable
              style={[S.cancelBtn, acting && S.btnDisabled]}
              onPress={() => setCancelOpen(true)}
              disabled={acting}
            >
              <Text style={S.cancelBtnText}>Отменить</Text>
            </Pressable>
          )}
        </View>
      )}

      {appt && (
        <CancelSheet
          appt={appt}
          visible={cancelOpen}
          onClose={() => setCancelOpen(false)}
          onCancelled={handleCancelled}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F7FF' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    backgroundColor: '#F8F7FF',
  },
  topBarTitle: { fontSize: 17, fontWeight: '700', color: '#1A1628' },

  scrollContent: { paddingBottom: 24 },

  clientBlock: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 20,
  },
  clientAvatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#EDE9FA',
    alignItems: 'center', justifyContent: 'center',
  },
  clientAvatarText: { fontSize: 20, fontWeight: '700', color: '#4A3DB0' },
  clientMeta: { flex: 1, gap: 4 },
  clientName: { fontSize: 18, fontWeight: '700', color: '#1A1628' },
  clientPhone: { fontSize: 14, color: '#4A3DB0' },
  noPhone: { fontSize: 13, color: '#9CA3AF' },

  divider: { height: 1, backgroundColor: '#F0EFF8', marginVertical: 4 },

  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  infoContent: { flex: 1, gap: 2 },
  infoMain: { fontSize: 14, color: '#1A1628', fontWeight: '500' },
  infoSub: { fontSize: 12, color: '#6B7280' },

  statusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  statusLabel: { fontSize: 14, color: '#6B7280' },
  statusValue: { fontSize: 14, fontWeight: '700' },

  // Actions
  actions: { paddingHorizontal: 16, paddingBottom: 40, gap: 10, paddingTop: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0EFF8' },
  completeBtn: {
    height: 52, borderRadius: 999, backgroundColor: '#4A3DB0',
    alignItems: 'center', justifyContent: 'center',
  },
  completeBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  cancelBtn: {
    height: 48, borderRadius: 999, borderWidth: 1, borderColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#EF4444' },
  btnDisabled: { opacity: 0.5 },

  // Toast
  toast: {
    position: 'absolute', top: 60, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#22C55E', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 99, zIndex: 100,
  },
  toastText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  // Cancel sheet
  sheetBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: SHEET_HEIGHT, backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 8,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E5E5',
    alignSelf: 'center', marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#1A1628' },
  sheetBody: { flex: 1, paddingHorizontal: 20 },
  sheetError: { fontSize: 13, color: '#EF4444', marginTop: 8 },
  sheetActions: { paddingHorizontal: 20, paddingBottom: 40, gap: 10, paddingTop: 12 },

  cancelSummary: { fontSize: 14, color: '#4B5563', marginBottom: 16 },
  policyBox: {
    backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14, gap: 6, marginBottom: 20,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  policyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  policyTitle: { fontSize: 13, fontWeight: '700', color: '#B45309' },
  policyLine: { fontSize: 12, color: '#92400E' },

  reasonLabel: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  reasonInput: {
    borderWidth: 1, borderColor: '#E8E4F8', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#1A1628', minHeight: 80, textAlignVertical: 'top',
  },
  reasonInputError: { borderColor: '#EF4444' },

  cancelConfirmBtn: {
    height: 52, borderRadius: 999, backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center',
  },
  cancelConfirmText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  keepBtn: { height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  keepBtnText: { fontSize: 15, color: '#6B7280' },
});
