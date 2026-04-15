import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { submitReview } from '@ayla/shared';

// ─── Rating buttons ────────────────────────────────────────────────────────────

function RatingPicker({
  value, onChange,
}: { value: number | null; onChange: (v: number) => void }) {
  return (
    <View style={S.ratingRow}>
      {[1, 2, 3, 4, 5].map((n) => {
        const selected = value === n;
        return (
          <Pressable
            key={n}
            style={[S.ratingBtn, selected && S.ratingBtnSelected]}
            onPress={() => onChange(n)}
            hitSlop={4}
          >
            <Text style={[S.ratingBtnText, selected && S.ratingBtnTextSelected]}>
              {n}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Checkbox ──────────────────────────────────────────────────────────────────

function Checkbox({
  value, onChange, label,
}: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable style={S.checkRow} onPress={() => onChange(!value)}>
      <View style={[S.checkbox, value && S.checkboxOn]}>
        {value && <Ionicons name="checkmark" size={13} color="#fff" />}
      </View>
      <Text style={S.checkLabel}>{label}</Text>
    </Pressable>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function ReviewScreen() {
  const { id, appointment_id, master_name } = useLocalSearchParams<{
    id: string;
    appointment_id?: string;
    master_name?: string;
  }>();

  const [step, setStep] = useState<'form' | 'success'>('form');
  const [rating, setRating] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = rating !== null && !loading;

  const handleSubmit = async () => {
    if (!canSubmit || !id) return;
    setLoading(true);
    setError('');
    try {
      await submitReview({
        specialist_id: id,
        appointment_id: appointment_id || undefined,
        rating: rating!,
        text: text.trim() || undefined,
        is_anonymous: isAnonymous,
      });
      setStep('success');
    } catch {
      setError('Не удалось отправить отзыв. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  // ── Экран успеха ────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <View style={S.successRoot}>
        <View style={S.successBody}>
          <View style={S.successCircle}>
            <Ionicons name="checkmark" size={52} color="#fff" />
          </View>
          <Text style={S.successTitle}>Отзыв опубликован!</Text>
          <Text style={S.successSub}>
            Спасибо за вашу оценку. Это помогает другим пользователям находить хороших мастеров.
          </Text>
        </View>
        <View style={S.bottomBar}>
          <Pressable style={S.btn} onPress={() => router.back()}>
            <Text style={S.btnText}>Понятно</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Форма ────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={S.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Шапка */}
      <View style={S.header}>
        <Pressable style={S.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
        </Pressable>
        <Text style={S.headerTitle}>Отзыв о мастере</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={S.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Имя мастера */}
        {!!master_name && (
          <Text style={S.masterName}>{master_name}</Text>
        )}

        {/* Рейтинг */}
        <Text style={S.label}>Оценка</Text>
        <RatingPicker value={rating} onChange={setRating} />

        {/* Подпись к выбранному рейтингу */}
        {rating !== null && (
          <Text style={S.ratingHint}>
            {['', 'Очень плохо', 'Плохо', 'Нормально', 'Хорошо', 'Отлично'][rating]}
          </Text>
        )}

        {/* Комментарий */}
        <Text style={[S.label, { marginTop: 24 }]}>Комментарий</Text>
        <TextInput
          style={S.textarea}
          value={text}
          onChangeText={setText}
          placeholder="Поделитесь впечатлениями о мастере…"
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={S.charCount}>{text.length}/500</Text>

        {/* Анонимный */}
        <View style={S.anonRow}>
          <Checkbox
            value={isAnonymous}
            onChange={setIsAnonymous}
            label="Анонимный отзыв"
          />
          <Text style={S.anonHint}>Ваше имя не будет показано</Text>
        </View>

        {/* Ошибка */}
        {!!error && <Text style={S.errorText}>{error}</Text>}
      </ScrollView>

      {/* Sticky кнопка */}
      <View style={S.bottomBar}>
        <Pressable
          style={[S.btn, !canSubmit && S.btnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={[S.btnText, !canSubmit && S.btnTextDisabled]}>Отправить</Text>
          }
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  // Шапка
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#1A1A1A' },

  inner: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },

  masterName: {
    fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 20,
  },

  // Рейтинг
  label: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 12 },
  ratingRow: { flexDirection: 'row', gap: 12 },
  ratingBtn: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 1.5, borderColor: '#E5E5E5',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
  },
  ratingBtnSelected: {
    backgroundColor: '#1A1A1A', borderColor: '#1A1A1A',
  },
  ratingBtnText: { fontSize: 18, fontWeight: '600', color: '#1A1A1A' },
  ratingBtnTextSelected: { color: '#fff' },
  ratingHint: {
    marginTop: 8, fontSize: 13, color: '#6B7280',
  },

  // Textarea
  textarea: {
    height: 120, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 12,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12,
    fontSize: 15, color: '#1A1A1A', lineHeight: 22,
  },
  charCount: { fontSize: 12, color: '#9CA3AF', marginTop: 4, textAlign: 'right' },

  // Анонимный
  anonRow: { marginTop: 20, gap: 4 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 5, borderWidth: 1.5,
    borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  checkLabel: { fontSize: 15, color: '#1A1A1A' },
  anonHint: { fontSize: 12, color: '#9CA3AF', marginLeft: 32 },

  errorText: { fontSize: 13, color: '#E53935', marginTop: 16 },

  // Sticky кнопка
  bottomBar: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12 },
  btn: {
    height: 52, borderRadius: 999, backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { backgroundColor: '#E5E5E5' },
  btnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  btnTextDisabled: { color: '#9CA3AF' },

  // Успех
  successRoot: { flex: 1, backgroundColor: '#fff' },
  successBody: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
  },
  successCircle: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center', marginBottom: 28,
  },
  successTitle: {
    fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 12, textAlign: 'center',
  },
  successSub: {
    fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22,
  },
});
