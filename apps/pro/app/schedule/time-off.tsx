import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, FlatList, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity,
  View, ActivityIndicator, Modal, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getTimeOffs, createTimeOff, deleteTimeOff, validateTimeOff, TimeOff } from '@ayla/shared';

// ─── Date / time helpers ──────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]; // "YYYY-MM-DD"
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Build array of {label, value} for next 90 days */
function buildDateOptions(): { label: string; value: string }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 91 }, (_, i) => {
    const d = addDays(today, i);
    const value = toDateStr(d);
    const label =
      i === 0 ? 'Сегодня' :
      i === 1 ? 'Завтра' :
      d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    return { label, value };
  });
}

const DATE_OPTIONS = buildDateOptions();

/** "YYYY-MM-DD" + "HH:MM" → UTC ISO string */
function toISO(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
}

/** 30-min time slots 06:00–23:30 */
const TIME_OPTIONS: string[] = (() => {
  const opts: string[] = [];
  for (let h = 6; h < 24; h++) {
    opts.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 23) opts.push(`${String(h).padStart(2, '0')}:30`);
  }
  return opts;
})();

// ─── Format display label for a time-off entry ────────────────────────────────

function formatEntry(item: TimeOff): string {
  const start = new Date(item.start_at);
  const end   = new Date(item.end_at);

  const isAllDay =
    start.getHours() === 0 && start.getMinutes() === 0 &&
    end.getHours() === 23 && end.getMinutes() >= 59;

  const startDay   = start.getDate();
  const endDay     = end.getDate();
  const startMonth = start.toLocaleDateString('ru-RU', { month: 'long' });
  const endMonth   = end.toLocaleDateString('ru-RU', { month: 'long' });
  const startFull  = start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  const endFull    = end.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  if (isAllDay) {
    if (startFull === endFull) return startFull;
    if (startMonth === endMonth) return `${startDay} – ${endDay} ${startMonth}`;
    return `${startFull} – ${endFull}`;
  }

  const st = start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const et = end.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `${startFull}, ${st} – ${et}`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <View style={S.skeletonWrap}>
      {[1, 2].map(i => (
        <View key={i} style={S.skeletonCard}>
          <View style={[S.skeletonLine, { width: '55%', height: 15 }]} />
          <View style={[S.skeletonLine, { width: '35%', height: 13, marginTop: 6 }]} />
        </View>
      ))}
    </View>
  );
}

// ─── Date picker modal ────────────────────────────────────────────────────────

function DatePicker({ label, value, onChange, minValue }: {
  label: string; value: string;
  onChange: (v: string) => void;
  minValue?: string;
}) {
  const [open, setOpen] = useState(false);
  const opts = minValue
    ? DATE_OPTIONS.filter(o => o.value >= minValue)
    : DATE_OPTIONS;
  const display = DATE_OPTIONS.find(o => o.value === value)?.label ?? value;

  return (
    <>
      <View style={S.pickerRow}>
        <Text style={S.pickerLabel}>{label}</Text>
        <Pressable style={S.pickerBtn} onPress={() => setOpen(true)}>
          <Text style={S.pickerValue}>{display}</Text>
          <Ionicons name="chevron-down" size={14} color="#9CA3AF" />
        </Pressable>
      </View>
      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable style={S.pickerBackdrop} onPress={() => setOpen(false)} />
        <View style={S.pickerModal}>
          <View style={S.pickerModalHeader}>
            <Text style={S.pickerModalTitle}>{label}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={12}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {opts.map(o => (
              <TouchableOpacity
                key={o.value}
                style={[S.pickerOption, o.value === value && S.pickerOptionActive]}
                onPress={() => { onChange(o.value); setOpen(false); }}
              >
                <Text style={[S.pickerOptionText, o.value === value && S.pickerOptionTextActive]}>
                  {o.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

// ─── Time picker ──────────────────────────────────────────────────────────────

function TimePicker({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <View style={S.pickerRow}>
        <Text style={S.pickerLabel}>{label}</Text>
        <Pressable style={S.pickerBtn} onPress={() => setOpen(true)}>
          <Text style={S.pickerValue}>{value}</Text>
          <Ionicons name="chevron-down" size={14} color="#9CA3AF" />
        </Pressable>
      </View>
      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable style={S.pickerBackdrop} onPress={() => setOpen(false)} />
        <View style={S.pickerModal}>
          <View style={S.pickerModalHeader}>
            <Text style={S.pickerModalTitle}>{label}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={12}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {TIME_OPTIONS.map(t => (
              <TouchableOpacity
                key={t}
                style={[S.pickerOption, t === value && S.pickerOptionActive]}
                onPress={() => { onChange(t); setOpen(false); }}
              >
                <Text style={[S.pickerOptionText, t === value && S.pickerOptionTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

// ─── Add bottom sheet ─────────────────────────────────────────────────────────

const SHEET_HEIGHT = 520;
const TODAY = toDateStr(new Date());

interface AddSheetProps {
  visible: boolean;
  onClose: () => void;
  onAdded: (entry: TimeOff) => void;
}

function AddSheet({ visible, onClose, onAdded }: AddSheetProps) {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  const [blockType, setBlockType] = useState<'allDay' | 'hours'>('allDay');
  const [startDate, setStartDate] = useState(TODAY);
  const [endDate, setEndDate] = useState(TODAY);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setBlockType('allDay');
      setStartDate(TODAY);
      setEndDate(TODAY);
      setStartTime('09:00');
      setEndTime('10:00');
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

  const handleSave = async () => {
    let startAt: Date;
    let endAt: Date;

    if (blockType === 'allDay') {
      startAt = new Date(`${startDate}T00:00:00`);
      endAt   = new Date(`${endDate}T23:59:59`);
    } else {
      startAt = new Date(`${startDate}T${startTime}:00`);
      endAt   = new Date(`${startDate}T${endTime}:00`);
    }

    const err = validateTimeOff(startAt, endAt);
    if (err) { setError(err); return; }

    setSaving(true);
    setError(null);
    try {
      const entry = await createTimeOff({
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        reason: reason.trim() || null,
      });
      onAdded(entry);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 409 || status === 400) {
        const detail = e?.response?.data?.detail ?? '';
        const match = detail.match(/(\d+)/);
        const count = match ? match[1] : '';
        Alert.alert(
          'Конфликт с записями',
          count
            ? `У тебя ${count} активных записей в этот период. Сначала отмени или перенеси их.`
            : 'В этот период есть активные записи. Сначала отмени или перенеси их.',
        );
      } else {
        setError('Не удалось добавить. Попробуй ещё раз');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={handleClose}>
      <Pressable style={S.sheetBackdrop} onPress={handleClose} />
      <Animated.View style={[S.sheet, { transform: [{ translateY }] }]}>
        <View style={S.sheetHandle} />
        <View style={S.sheetHeader}>
          <Text style={S.sheetTitle}>Новая блокировка</Text>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={22} color="#6B7280" />
          </Pressable>
        </View>

        <ScrollView style={S.sheetBody} showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* Type toggle */}
          <View style={S.radioRow}>
            <Pressable style={S.radioOption} onPress={() => setBlockType('allDay')}>
              <View style={[S.radioCircle, blockType === 'allDay' && S.radioCircleActive]}>
                {blockType === 'allDay' && <View style={S.radioDot} />}
              </View>
              <Text style={S.radioLabel}>На весь день</Text>
            </Pressable>
            <Pressable style={S.radioOption} onPress={() => setBlockType('hours')}>
              <View style={[S.radioCircle, blockType === 'hours' && S.radioCircleActive]}>
                {blockType === 'hours' && <View style={S.radioDot} />}
              </View>
              <Text style={S.radioLabel}>Несколько часов</Text>
            </Pressable>
          </View>

          <View style={S.divider} />

          {blockType === 'allDay' ? (
            <>
              <DatePicker label="Дата начала"    value={startDate} onChange={v => { setStartDate(v); if (v > endDate) setEndDate(v); }} />
              <DatePicker label="Дата окончания" value={endDate}   onChange={setEndDate} minValue={startDate} />
            </>
          ) : (
            <>
              <DatePicker label="Дата"           value={startDate} onChange={setStartDate} />
              <View style={S.divider} />
              <TimePicker label="Время начала"   value={startTime} onChange={setStartTime} />
              <TimePicker label="Время окончания" value={endTime}  onChange={setEndTime} />
            </>
          )}

          <View style={S.divider} />

          {/* Reason */}
          <Text style={S.reasonLabel}>Причина (необязательно)</Text>
          <TextInput
            style={S.reasonInput}
            value={reason}
            onChangeText={setReason}
            placeholder="Отпуск, врач, личное…"
            placeholderTextColor="#9CA3AF"
            maxLength={120}
          />

          {error && <Text style={S.sheetError}>{error}</Text>}
        </ScrollView>

        <View style={S.sheetActions}>
          <Pressable style={[S.saveBtn, saving && S.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={S.saveBtnText}>Сохранить</Text>
            }
          </Pressable>
          <Pressable style={S.cancelBtn} onPress={handleClose} disabled={saving}>
            <Text style={S.cancelBtnText}>Отмена</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function useToast() {
  const opacity = useRef(new Animated.Value(0)).current;
  const [msg, setMsg] = useState('');

  const show = useCallback((message: string) => {
    setMsg(message);
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1600),
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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TimeOffScreen() {
  const [items, setItems] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { show: showToast, Toast } = useToast();

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const today = toDateStr(new Date());
      const in60  = toDateStr(addDays(new Date(), 60));
      const data  = await getTimeOffs(today, in60);
      setItems(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = (item: TimeOff) => {
    Alert.alert(
      'Удалить блокировку?',
      formatEntry(item),
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить', style: 'destructive',
          onPress: async () => {
            const prev = [...items];
            setItems(s => s.filter(t => t.id !== item.id));
            try {
              await deleteTimeOff(item.id);
              showToast('Блокировка удалена');
            } catch {
              setItems(prev);
              Alert.alert('Ошибка', 'Не удалось удалить. Попробуй ещё раз');
            }
          },
        },
      ],
    );
  };

  const handleAdded = (entry: TimeOff) => {
    setItems(prev =>
      [...prev, entry].sort((a, b) => a.start_at.localeCompare(b.start_at)),
    );
    setSheetOpen(false);
    showToast('Блокировка добавлена');
  };

  if (loading) {
    return (
      <View style={S.root}>
        <Header onAdd={() => setSheetOpen(true)} />
        <Skeleton />
      </View>
    );
  }

  return (
    <View style={S.root}>
      {Toast}
      <FlatList
        data={items}
        keyExtractor={t => t.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#4A3DB0" />
        }
        ListHeaderComponent={<Header onAdd={() => setSheetOpen(true)} />}
        ListEmptyComponent={
          <View style={S.empty}>
            <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
            <Text style={S.emptyTitle}>Нет блокировок</Text>
            <Text style={S.emptySub}>Добавь выходной, если уходишь в отпуск{'\n'}или нужен перерыв</Text>
            <Pressable style={S.emptyBtn} onPress={() => setSheetOpen(true)}>
              <Ionicons name="add" size={16} color="#4A3DB0" />
              <Text style={S.emptyBtnText}>Добавить блокировку</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <View style={S.card}>
            <View style={S.cardBody}>
              <Text style={S.cardDate}>{formatEntry(item)}</Text>
              {item.reason ? <Text style={S.cardReason}>{item.reason}</Text> : null}
            </View>
            <Pressable onPress={() => handleDelete(item)} hitSlop={12} style={S.deleteBtn}>
              <Ionicons name="trash-outline" size={18} color="#E53935" />
            </Pressable>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={S.separator} />}
      />

      <AddSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAdded={handleAdded}
      />
    </View>
  );
}

function Header({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={S.header}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={S.backBtn}>
        <Ionicons name="chevron-back" size={22} color="#1A1628" />
      </Pressable>
      <Text style={S.headerTitle}>Выходные и блокировки</Text>
      <Pressable onPress={onAdd} style={S.addBtn} hitSlop={8}>
        <Ionicons name="add" size={22} color="#4A3DB0" />
      </Pressable>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F7FF' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#F8F7FF',
  },
  backBtn: { marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#1A1628' },
  addBtn: { padding: 4 },

  // Cards
  card: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#fff',
  },
  cardBody: { flex: 1 },
  cardDate: { fontSize: 14, fontWeight: '600', color: '#1A1628' },
  cardReason: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  deleteBtn: { padding: 4 },
  separator: { height: 1, backgroundColor: '#F0EFF8' },

  // Skeleton
  skeletonWrap: { paddingTop: 8 },
  skeletonCard: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0EFF8',
  },
  skeletonLine: { borderRadius: 8, backgroundColor: '#EDE9FA' },

  // Empty
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#1A1628' },
  emptySub: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: '#4A3DB0', borderRadius: 99,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '600', color: '#4A3DB0' },

  // Bottom sheet
  sheetBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 8,
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
  sheetError: { fontSize: 13, color: '#E53935', marginTop: 12, textAlign: 'center' },
  sheetActions: { paddingHorizontal: 20, paddingBottom: 40, gap: 10, paddingTop: 12 },

  // Radio
  radioRow: { flexDirection: 'row', gap: 24, paddingVertical: 8 },
  radioOption: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radioCircle: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
  },
  radioCircleActive: { borderColor: '#4A3DB0' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4A3DB0' },
  radioLabel: { fontSize: 14, color: '#1A1628' },

  divider: { height: 1, backgroundColor: '#F0EFF8', marginVertical: 12 },

  // Pickers (shared date/time)
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10,
  },
  pickerLabel: { fontSize: 14, color: '#4B5563', width: 120 },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#F8F7FF', borderRadius: 10,
    borderWidth: 1, borderColor: '#E8E4F8', minWidth: 110,
    justifyContent: 'space-between',
  },
  pickerValue: { fontSize: 14, fontWeight: '600', color: '#1A1628' },

  pickerBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  pickerModal: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: 360, paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  pickerModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0EFF8',
  },
  pickerModalTitle: { fontSize: 16, fontWeight: '600', color: '#1A1628' },
  pickerOption: { paddingHorizontal: 20, paddingVertical: 14 },
  pickerOptionActive: { backgroundColor: '#EDE9FA' },
  pickerOptionText: { fontSize: 15, color: '#1A1628' },
  pickerOptionTextActive: { color: '#4A3DB0', fontWeight: '700' },

  // Reason
  reasonLabel: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  reasonInput: {
    borderWidth: 1, borderColor: '#E8E4F8', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#1A1628', backgroundColor: '#fff',
  },

  // Actions
  saveBtn: {
    height: 52, borderRadius: 999, backgroundColor: '#4A3DB0',
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  cancelBtn: { height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 15, color: '#6B7280' },

  // Toast
  toast: {
    position: 'absolute', top: 60, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#22C55E', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 99, zIndex: 100,
  },
  toastText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
