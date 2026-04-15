import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, FlatList, Modal, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
  ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  getSchedule, patchScheduleDay, validateWorkingDay,
  WorkingDay, DayOfWeek,
} from '@ayla/shared';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_SHORT: Record<DayOfWeek, string> = {
  0: 'Пн', 1: 'Вт', 2: 'Ср', 3: 'Чт', 4: 'Пт', 5: 'Сб', 6: 'Вс',
};
const DAY_FULL: Record<DayOfWeek, string> = {
  0: 'Понедельник', 1: 'Вторник', 2: 'Среда',
  3: 'Четверг', 4: 'Пятница', 5: 'Суббота', 6: 'Воскресенье',
};

/** 30-min slots 06:00–23:30 */
const TIME_OPTIONS: string[] = (() => {
  const opts: string[] = [];
  for (let h = 6; h < 24; h++) {
    opts.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 23) opts.push(`${String(h).padStart(2, '0')}:30`);
  }
  return opts;
})();

const SHEET_HEIGHT = 560;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <View style={S.skeletonWrap}>
      {Array.from({ length: 7 }, (_, i) => (
        <View key={i} style={S.skeletonRow}>
          <View style={[S.skeletonBox, { width: 28 }]} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={[S.skeletonBox, { width: '50%', height: 14 }]} />
            <View style={[S.skeletonBox, { width: '30%', height: 12 }]} />
          </View>
          <View style={[S.skeletonBox, { width: 24, height: 24, borderRadius: 12 }]} />
        </View>
      ))}
    </View>
  );
}

// ─── DayRow ───────────────────────────────────────────────────────────────────

function DayRow({ day, onEdit }: { day: WorkingDay; onEdit: () => void }) {
  return (
    <Pressable style={S.dayRow} onPress={onEdit}>
      <Text style={S.dayShort}>{DAY_SHORT[day.day_of_week]}</Text>
      <View style={S.dayMeta}>
        {day.is_working_day ? (
          <>
            <Text style={S.dayHours}>
              {day.start_time} – {day.end_time}
            </Text>
            {day.break_start && day.break_end && (
              <Text style={S.dayBreak}>
                перерыв {day.break_start} – {day.break_end}
              </Text>
            )}
          </>
        ) : (
          <Text style={S.dayOff}>Выходной</Text>
        )}
      </View>
      <Pressable onPress={onEdit} hitSlop={12} style={S.editIcon}>
        <Ionicons name="pencil-outline" size={16} color="#6B7280" />
      </Pressable>
    </Pressable>
  );
}

// ─── TimePicker ───────────────────────────────────────────────────────────────

function TimePicker({
  label, value, onChange, disabled,
}: { label: string; value: string | null; onChange: (v: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <View style={S.timePickerRow}>
        <Text style={S.timePickerLabel}>{label}</Text>
        <Pressable
          style={[S.timePickerBtn, disabled && S.timePickerBtnDisabled]}
          onPress={() => !disabled && setOpen(true)}
          disabled={disabled}
        >
          <Text style={[S.timePickerValue, !value && { color: '#9CA3AF' }]}>
            {value ?? '—'}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#9CA3AF" />
        </Pressable>
      </View>

      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable style={S.timeBackdrop} onPress={() => setOpen(false)} />
        <View style={S.timeModal}>
          <View style={S.timeModalHeader}>
            <Text style={S.timeModalTitle}>{label}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={12}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {TIME_OPTIONS.map(t => (
              <TouchableOpacity
                key={t}
                style={[S.timeOption, t === value && S.timeOptionActive]}
                onPress={() => { onChange(t); setOpen(false); }}
              >
                <Text style={[S.timeOptionText, t === value && S.timeOptionTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

// ─── EditSheet ────────────────────────────────────────────────────────────────

interface EditSheetProps {
  day: WorkingDay | null;
  onClose: () => void;
  onSave: (updated: WorkingDay) => Promise<void>;
}

function EditSheet({ day, onClose, onSave }: EditSheetProps) {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local edit state
  const [isWorking, setIsWorking] = useState(day?.is_working_day ?? true);
  const [startTime, setStartTime] = useState<string | null>(day?.start_time ?? '10:00');
  const [endTime, setEndTime] = useState<string | null>(day?.end_time ?? '20:00');
  const [hasBreak, setHasBreak] = useState(!!(day?.break_start && day?.break_end));
  const [breakStart, setBreakStart] = useState<string | null>(day?.break_start ?? '13:00');
  const [breakEnd, setBreakEnd] = useState<string | null>(day?.break_end ?? '14:00');

  useEffect(() => {
    if (day) {
      setIsWorking(day.is_working_day);
      setStartTime(day.start_time ?? '10:00');
      setEndTime(day.end_time ?? '20:00');
      setHasBreak(!!(day.break_start && day.break_end));
      setBreakStart(day.break_start ?? '13:00');
      setBreakEnd(day.break_end ?? '14:00');
      setError(null);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 3 }).start();
    } else {
      Animated.timing(translateY, { toValue: SHEET_HEIGHT, duration: 240, useNativeDriver: true }).start();
    }
  }, [day]);

  const handleSave = async () => {
    if (!day) return;
    const updated: WorkingDay = {
      day_of_week: day.day_of_week,
      is_working_day: isWorking,
      start_time: isWorking ? startTime : null,
      end_time: isWorking ? endTime : null,
      break_start: isWorking && hasBreak ? breakStart : null,
      break_end: isWorking && hasBreak ? breakEnd : null,
    };
    const err = validateWorkingDay(updated);
    if (err) { setError(err); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave(updated);
    } catch {
      setError('Не удалось сохранить. Попробуй ещё раз');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    Animated.timing(translateY, { toValue: SHEET_HEIGHT, duration: 240, useNativeDriver: true })
      .start(() => onClose());
  };

  if (!day) return null;

  return (
    <Modal transparent animationType="none" visible={!!day} onRequestClose={handleClose}>
      <Pressable style={S.sheetBackdrop} onPress={handleClose} />
      <Animated.View style={[S.sheet, { transform: [{ translateY }] }]}>
        <View style={S.sheetHandle} />

        {/* Header */}
        <View style={S.sheetHeader}>
          <Text style={S.sheetTitle}>{DAY_FULL[day.day_of_week]}</Text>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={22} color="#6B7280" />
          </Pressable>
        </View>

        <ScrollView
          style={S.sheetBody}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Radio — working / day off */}
          <View style={S.radioRow}>
            <Pressable style={S.radioOption} onPress={() => setIsWorking(true)}>
              <View style={[S.radioCircle, isWorking && S.radioCircleActive]}>
                {isWorking && <View style={S.radioDot} />}
              </View>
              <Text style={S.radioLabel}>Рабочий день</Text>
            </Pressable>
            <Pressable style={S.radioOption} onPress={() => setIsWorking(false)}>
              <View style={[S.radioCircle, !isWorking && S.radioCircleActive]}>
                {!isWorking && <View style={S.radioDot} />}
              </View>
              <Text style={S.radioLabel}>Выходной</Text>
            </Pressable>
          </View>

          {isWorking && (
            <>
              <View style={S.divider} />
              <TimePicker label="Начало" value={startTime} onChange={setStartTime} />
              <TimePicker label="Окончание" value={endTime} onChange={setEndTime} />

              <View style={S.divider} />

              {!hasBreak ? (
                <Pressable style={S.addBreakBtn} onPress={() => setHasBreak(true)}>
                  <Ionicons name="add-circle-outline" size={18} color="#4A3DB0" />
                  <Text style={S.addBreakText}>Добавить перерыв</Text>
                </Pressable>
              ) : (
                <>
                  <TimePicker label="Перерыв с" value={breakStart} onChange={setBreakStart} />
                  <TimePicker label="до" value={breakEnd} onChange={setBreakEnd} />
                  <Pressable style={S.removeBreakBtn} onPress={() => setHasBreak(false)}>
                    <Ionicons name="trash-outline" size={16} color="#E53935" />
                    <Text style={S.removeBreakText}>Удалить перерыв</Text>
                  </Pressable>
                </>
              )}
            </>
          )}

          {error && <Text style={S.sheetError}>{error}</Text>}
        </ScrollView>

        {/* Actions */}
        <View style={S.sheetActions}>
          <Pressable
            style={[S.saveBtn, saving && S.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
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
  const show = useCallback(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1600),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);
  const Toast = (
    <Animated.View style={[S.toast, { opacity }]} pointerEvents="none">
      <Ionicons name="checkmark-circle" size={16} color="#fff" />
      <Text style={S.toastText}>Сохранено</Text>
    </Animated.View>
  );
  return { show, Toast };
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ScheduleScreen() {
  const [schedule, setSchedule] = useState<WorkingDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<WorkingDay | null>(null);
  const { show: showToast, Toast } = useToast();

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await getSchedule();
      setSchedule(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (updated: WorkingDay) => {
    // Optimistic update
    const prev = schedule.find(d => d.day_of_week === updated.day_of_week);
    setSchedule(s => s.map(d => d.day_of_week === updated.day_of_week ? updated : d));
    setEditing(null);
    try {
      await patchScheduleDay({
        day_of_week: updated.day_of_week,
        is_working_day: updated.is_working_day,
        start_time: updated.start_time,
        end_time: updated.end_time,
        break_start: updated.break_start,
        break_end: updated.break_end,
      });
      showToast();
    } catch (e) {
      // Rollback
      if (prev) setSchedule(s => s.map(d => d.day_of_week === prev.day_of_week ? prev : d));
      throw e;
    }
  };

  if (loading) {
    return (
      <View style={S.root}>
        <View style={S.titleBar}>
          <Text style={S.titleBarText}>Расписание</Text>
        </View>
        <Skeleton />
      </View>
    );
  }

  return (
    <View style={S.root}>
      {Toast}
      <FlatList
        data={schedule}
        keyExtractor={d => String(d.day_of_week)}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#4A3DB0" />
        }
        ListHeaderComponent={
          <View style={S.titleBar}>
            <Text style={S.titleBarText}>Расписание</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={S.empty}>
            <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
            <Text style={S.emptyText}>Расписание не задано</Text>
          </View>
        }
        renderItem={({ item }) => (
          <DayRow day={item} onEdit={() => setEditing(item)} />
        )}
        ItemSeparatorComponent={() => <View style={S.separator} />}
        ListFooterComponent={
          <Pressable
            style={S.timeOffBtn}
            onPress={() => router.push('/schedule/time-off' as any)}
          >
            <Text style={S.timeOffText}>Управление выходными</Text>
            <Ionicons name="chevron-forward" size={16} color="#4A3DB0" />
          </Pressable>
        }
      />

      <EditSheet
        day={editing}
        onClose={() => setEditing(null)}
        onSave={handleSave}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F7FF' },

  titleBar: {
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
  },
  titleBarText: { fontSize: 24, fontWeight: '700', color: '#1A1628' },

  // Day rows
  dayRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#fff',
  },
  dayShort: { width: 32, fontSize: 14, fontWeight: '700', color: '#1A1628' },
  dayMeta: { flex: 1 },
  dayHours: { fontSize: 14, color: '#1A1628', fontWeight: '500' },
  dayBreak: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  dayOff: { fontSize: 14, color: '#9CA3AF' },
  editIcon: { padding: 4 },
  separator: { height: 1, backgroundColor: '#F0EFF8', marginLeft: 20 },

  // Footer
  timeOffBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    margin: 20, padding: 16, backgroundColor: '#fff',
    borderRadius: 12, borderWidth: 1, borderColor: '#E8E4F8',
  },
  timeOffText: { fontSize: 14, fontWeight: '600', color: '#4A3DB0' },

  // Skeleton
  skeletonWrap: { paddingTop: 8 },
  skeletonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0EFF8',
  },
  skeletonBox: { height: 16, borderRadius: 8, backgroundColor: '#EDE9FA' },

  // Empty
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },

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

  // Divider
  divider: { height: 1, backgroundColor: '#F0EFF8', marginVertical: 12 },

  // Time picker
  timePickerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10,
  },
  timePickerLabel: { fontSize: 14, color: '#4B5563', width: 100 },
  timePickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#F8F7FF', borderRadius: 10,
    borderWidth: 1, borderColor: '#E8E4F8',
    minWidth: 90, justifyContent: 'space-between',
  },
  timePickerBtnDisabled: { opacity: 0.4 },
  timePickerValue: { fontSize: 15, fontWeight: '600', color: '#1A1628' },

  // Time modal
  timeBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  timeModal: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: 360, paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  timeModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0EFF8',
  },
  timeModalTitle: { fontSize: 16, fontWeight: '600', color: '#1A1628' },
  timeOption: { paddingHorizontal: 20, paddingVertical: 14 },
  timeOptionActive: { backgroundColor: '#EDE9FA' },
  timeOptionText: { fontSize: 15, color: '#1A1628' },
  timeOptionTextActive: { color: '#4A3DB0', fontWeight: '700' },

  // Break
  addBreakBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  addBreakText: { fontSize: 14, color: '#4A3DB0', fontWeight: '500' },
  removeBreakBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  removeBreakText: { fontSize: 13, color: '#E53935' },

  // Actions
  saveBtn: {
    height: 52, borderRadius: 999, backgroundColor: '#4A3DB0',
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  cancelBtn: {
    height: 48, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
  },
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
