import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, FlatList, TextInput,
  Animated, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getTemplates, getRegions, ServiceTemplate, ServiceRegion, TemplateServiceCreate,
} from '@ayla/shared';

// ─── Duration options ─────────────────────────────────────────────────────────

const DURATION_OPTS = [15, 30, 45, 60, 75, 90, 120, 150, 180];

function durationLabel(m: number) {
  const h = Math.floor(m / 60), r = m % 60;
  if (h === 0) return `${m} мин`;
  return r ? `${h}ч ${r}м` : `${h} ч`;
}

function midpoint(min: number, max: number) {
  const mid = Math.round((min + max) / 2 / 50) * 50;
  return String(Math.max(mid, 100));
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Selection {
  template: ServiceTemplate;
  priceMode: 'single' | 'range';
  priceMin: string;
  priceMax: string;
  duration: string;
}

interface CustomService {
  name: string;
  priceMin: string;
  priceMax: string;
  priceMode: 'single' | 'range';
  duration: string;
  category: string;
}

export interface TemplatePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (services: TemplateServiceCreate[]) => Promise<void>;
  categoryFilter?: string;
  existingNames?: string[];
}

// ─── Region selector sheet ────────────────────────────────────────────────────

function RegionSheet({
  visible, regions, current, onSelect, onClose,
}: {
  visible: boolean; regions: ServiceRegion[];
  current: ServiceRegion | null; onSelect: (r: ServiceRegion) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={R.overlay}>
        <Pressable style={R.backdrop} onPress={onClose} />
        <View style={R.sheet}>
          <View style={R.handle} />
          <Text style={R.title}>Выберите регион</Text>
          {regions.map(r => (
            <Pressable key={r.id} style={[R.row, current?.id === r.id && R.rowActive]} onPress={() => { onSelect(r); onClose(); }}>
              <Text style={[R.rowText, current?.id === r.id && R.rowTextActive]}>{r.name}</Text>
              {current?.id === r.id && <Ionicons name="checkmark" size={18} color="#4A3DB0" />}
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const R = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2DCF0', alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1628', marginBottom: 16 },
  row: { paddingVertical: 14, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowActive: { backgroundColor: '#F0EEFF', borderRadius: 10 },
  rowText: { fontSize: 15, color: '#4A4358' },
  rowTextActive: { color: '#4A3DB0', fontWeight: '600' },
});

// ─── Price toggle ─────────────────────────────────────────────────────────────

function PriceToggle({ mode, onToggle }: { mode: 'single' | 'range'; onToggle: () => void }) {
  return (
    <Pressable style={P.toggle} onPress={onToggle}>
      <View style={[P.seg, mode === 'single' && P.segActive]}>
        <Text style={[P.segText, mode === 'single' && P.segTextActive]}>≈ одна цена</Text>
      </View>
      <View style={[P.seg, mode === 'range' && P.segActive]}>
        <Text style={[P.segText, mode === 'range' && P.segTextActive]}>↔ диапазон</Text>
      </View>
    </Pressable>
  );
}

const P = StyleSheet.create({
  toggle: {
    flexDirection: 'row', backgroundColor: '#F0EEFF',
    borderRadius: 10, padding: 3, marginBottom: 8,
  },
  seg: { flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  segActive: { backgroundColor: '#4A3DB0' },
  segText: { fontSize: 12, color: '#7A7286', fontWeight: '600' },
  segTextActive: { color: '#fff' },
});

// ─── Step 1: Template selection ───────────────────────────────────────────────

function TemplateRow({
  template, selected, disabled, onToggle,
}: {
  template: ServiceTemplate; selected: boolean; disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      style={[T.row, selected && T.rowSelected, disabled && T.rowDisabled]}
      onPress={disabled ? undefined : onToggle}
    >
      <View style={[T.checkbox, selected && T.checkboxActive]}>
        {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
      <View style={T.info}>
        <Text style={[T.name, disabled && T.nameDisabled]}>{template.name}</Text>
        {disabled ? (
          <Text style={T.addedLabel}>Уже добавлено</Text>
        ) : (
          <Text style={T.range}>Рекомендуем: {template.price_min.toLocaleString('ru')} – {template.price_max.toLocaleString('ru')} ₽</Text>
        )}
      </View>
    </Pressable>
  );
}

const T = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 4,
    borderWidth: 1, borderColor: '#E8E4F8',
  },
  rowSelected: { borderColor: '#4A3DB0', backgroundColor: '#F7F5FF' },
  rowDisabled: { opacity: 0.45 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: '#C8C2E8',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: '#4A3DB0', borderColor: '#4A3DB0' },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: '#1A1628' },
  nameDisabled: { color: '#B0A8B9' },
  range: { fontSize: 12, color: '#7A7286', marginTop: 2 },
  addedLabel: { fontSize: 12, color: '#B0A8B9', marginTop: 2 },
});

// ─── Main component ───────────────────────────────────────────────────────────

export default function TemplatePickerSheet({
  visible, onClose, onSave, categoryFilter, existingNames = [],
}: TemplatePickerSheetProps) {
  const slideAnim = useRef(new Animated.Value(800)).current;

  const [step, setStep] = useState<'select' | 'price'>('select');
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [regions, setRegions] = useState<ServiceRegion[]>([]);
  const [currentRegion, setCurrentRegion] = useState<ServiceRegion | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [regionSheetVisible, setRegionSheetVisible] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selections, setSelections] = useState<Selection[]>([]);

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customService, setCustomService] = useState<CustomService>({
    name: '', priceMin: '', priceMax: '', priceMode: 'single', duration: '60', category: categoryFilter ?? 'nails',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setStep('select');
      setSelectedIds(new Set());
      setSelections([]);
      setShowCustomForm(false);
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }).start();
      loadData();
    } else {
      Animated.timing(slideAnim, { toValue: 800, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);

  async function loadData() {
    setLoadingTemplates(true);
    try {
      const [t, r] = await Promise.all([
        getTemplates({ category: categoryFilter }),
        getRegions(),
      ]);
      setTemplates(t);
      setRegions(r);
      if (!currentRegion && r.length > 0) setCurrentRegion(r[2]); // default Пенза
    } finally {
      setLoadingTemplates(false);
    }
  }

  function toggleTemplate(t: ServiceTemplate) {
    const next = new Set(selectedIds);
    if (next.has(t.id)) {
      next.delete(t.id);
    } else {
      next.add(t.id);
    }
    setSelectedIds(next);
  }

  function goToPrice() {
    const sels: Selection[] = [...selectedIds].map(id => {
      const t = templates.find(x => x.id === id)!;
      return {
        template: t,
        priceMode: 'single',
        priceMin: midpoint(t.price_min, t.price_max),
        priceMax: midpoint(t.price_min, t.price_max),
        duration: String(t.duration_minutes),
      };
    });
    setSelections(sels);
    setStep('price');
  }

  function updateSelection(id: string, patch: Partial<Selection>) {
    setSelections(prev => prev.map(s => s.template.id === id ? { ...s, ...patch } : s));
  }

  function validatePrices(): string | null {
    for (const s of selections) {
      const min = parseInt(s.priceMin, 10);
      const max = parseInt(s.priceMax, 10);
      if (isNaN(min) || min < 100) return `«${s.template.name}»: цена ≥ 100 ₽`;
      if (s.priceMode === 'range' && (isNaN(max) || max < min)) return `«${s.template.name}»: max ≥ min`;
    }
    if (showCustomForm) {
      if (!customService.name.trim()) return 'Укажите название своей услуги';
      const min = parseInt(customService.priceMin, 10);
      if (isNaN(min) || min < 100) return 'Своя услуга: цена ≥ 100 ₽';
    }
    return null;
  }

  async function handleSave() {
    const err = validatePrices();
    if (err) { Alert.alert('Проверьте данные', err); return; }

    setSaving(true);
    const services: TemplateServiceCreate[] = selections.map(s => ({
      template_id: s.template.id,
      name: s.template.name,
      price_min: parseInt(s.priceMin, 10),
      price_max: s.priceMode === 'range' ? parseInt(s.priceMax, 10) : parseInt(s.priceMin, 10),
      duration_minutes: parseInt(s.duration, 10),
      category: s.template.category,
    }));

    if (showCustomForm && customService.name.trim()) {
      services.push({
        name: customService.name.trim(),
        price_min: parseInt(customService.priceMin, 10),
        price_max: customService.priceMode === 'range'
          ? parseInt(customService.priceMax, 10)
          : parseInt(customService.priceMin, 10),
        duration_minutes: parseInt(customService.duration, 10),
        category: customService.category,
      });
    }

    try {
      await onSave(services);
    } catch {
      Alert.alert('Ошибка', 'Не удалось сохранить услуги');
    } finally {
      setSaving(false);
    }
  }

  const popular = templates.filter(t => t.is_popular);
  const others = templates.filter(t => !t.is_popular);

  return (
    <>
      <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
        <KeyboardAvoidingView
          style={S.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={S.backdrop} onPress={onClose} />

          <Animated.View style={[S.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={S.handle} />

            {/* Header */}
            <View style={S.header}>
              {step === 'price' ? (
                <Pressable onPress={() => setStep('select')} style={S.backBtn}>
                  <Ionicons name="arrow-back" size={20} color="#4A3DB0" />
                </Pressable>
              ) : (
                <View style={{ width: 32 }} />
              )}
              <Text style={S.title}>
                {step === 'select' ? 'Добавить из шаблонов' : 'Укажите цены'}
              </Text>
              <Pressable onPress={onClose} style={S.backBtn}>
                <Ionicons name="close" size={20} color="#7A7286" />
              </Pressable>
            </View>

            {/* Region badge */}
            {step === 'select' && (
              <Pressable style={S.regionBadge} onPress={() => setRegionSheetVisible(true)}>
                <Text style={S.regionText}>Цены для {currentRegion?.name ?? '…'}</Text>
                <Ionicons name="chevron-down" size={14} color="#4A3DB0" />
              </Pressable>
            )}

            {/* ── Step 1: Select ── */}
            {step === 'select' && (
              loadingTemplates ? (
                <View style={S.center}><ActivityIndicator color="#4A3DB0" /></View>
              ) : (
                <ScrollView
                  style={S.scroll}
                  contentContainerStyle={S.scrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {popular.length > 0 && (
                    <>
                      <Text style={S.sectionLabel}>ПОПУЛЯРНЫЕ</Text>
                      {popular.map(t => (
                        <TemplateRow
                          key={t.id}
                          template={t}
                          selected={selectedIds.has(t.id)}
                          disabled={existingNames.includes(t.name)}
                          onToggle={() => toggleTemplate(t)}
                        />
                      ))}
                    </>
                  )}
                  {others.length > 0 && (
                    <>
                      <View style={S.divider}><Text style={S.dividerText}>Все услуги</Text></View>
                      {others.map(t => (
                        <TemplateRow
                          key={t.id}
                          template={t}
                          selected={selectedIds.has(t.id)}
                          disabled={existingNames.includes(t.name)}
                          onToggle={() => toggleTemplate(t)}
                        />
                      ))}
                    </>
                  )}

                  {/* Custom service */}
                  {showCustomForm ? (
                    <View style={S.customForm}>
                      <Text style={S.customLabel}>Своя услуга</Text>
                      <TextInput
                        style={S.input}
                        value={customService.name}
                        onChangeText={v => setCustomService(f => ({ ...f, name: v }))}
                        placeholder="Название*"
                        placeholderTextColor="#8A80C0"
                        autoFocus
                      />
                      <PriceToggle
                        mode={customService.priceMode}
                        onToggle={() => setCustomService(f => ({ ...f, priceMode: f.priceMode === 'single' ? 'range' : 'single' }))}
                      />
                      <View style={S.priceRow}>
                        <TextInput
                          style={[S.input, { flex: 1 }]}
                          value={customService.priceMin}
                          onChangeText={v => setCustomService(f => ({ ...f, priceMin: v.replace(/\D/g, '') }))}
                          placeholder="Цена ₽"
                          placeholderTextColor="#8A80C0"
                          keyboardType="numeric"
                        />
                        {customService.priceMode === 'range' && (
                          <>
                            <Text style={S.dash}>—</Text>
                            <TextInput
                              style={[S.input, { flex: 1 }]}
                              value={customService.priceMax}
                              onChangeText={v => setCustomService(f => ({ ...f, priceMax: v.replace(/\D/g, '') }))}
                              placeholder="До ₽"
                              placeholderTextColor="#8A80C0"
                              keyboardType="numeric"
                            />
                          </>
                        )}
                      </View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {DURATION_OPTS.map(d => (
                          <Pressable
                            key={d}
                            style={[S.durChip, customService.duration === String(d) && S.durChipActive]}
                            onPress={() => setCustomService(f => ({ ...f, duration: String(d) }))}
                          >
                            <Text style={[S.durChipText, customService.duration === String(d) && { color: '#fff' }]}>
                              {durationLabel(d)}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                      <Pressable style={S.removeCustom} onPress={() => setShowCustomForm(false)}>
                        <Text style={S.removeCustomText}>Убрать</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable style={S.addCustomBtn} onPress={() => setShowCustomForm(true)}>
                      <Ionicons name="add" size={18} color="#4A3DB0" />
                      <Text style={S.addCustomText}>Добавить свою услугу</Text>
                    </Pressable>
                  )}

                  <Text style={S.hint}>ℹ️ Цены можно изменить позже</Text>
                  <View style={{ height: 16 }} />
                </ScrollView>
              )
            )}

            {/* ── Step 2: Price ── */}
            {step === 'price' && (
              <ScrollView
                style={S.scroll}
                contentContainerStyle={S.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {selections.map(s => (
                  <View key={s.template.id} style={S.priceCard}>
                    <Text style={S.priceCardName}>{s.template.name}</Text>
                    <Text style={S.priceCardRange}>
                      Рекомендуем: {s.template.price_min.toLocaleString('ru')} – {s.template.price_max.toLocaleString('ru')} ₽
                    </Text>
                    <PriceToggle
                      mode={s.priceMode}
                      onToggle={() => updateSelection(s.template.id, {
                        priceMode: s.priceMode === 'single' ? 'range' : 'single',
                      })}
                    />
                    <View style={S.priceRow}>
                      <TextInput
                        style={[S.input, { flex: 1 }]}
                        value={s.priceMin}
                        onChangeText={v => updateSelection(s.template.id, { priceMin: v.replace(/\D/g, '') })}
                        placeholder="Цена ₽"
                        placeholderTextColor="#8A80C0"
                        keyboardType="numeric"
                      />
                      {s.priceMode === 'range' && (
                        <>
                          <Text style={S.dash}>—</Text>
                          <TextInput
                            style={[S.input, { flex: 1 }]}
                            value={s.priceMax}
                            onChangeText={v => updateSelection(s.template.id, { priceMax: v.replace(/\D/g, '') })}
                            placeholder="До ₽"
                            placeholderTextColor="#8A80C0"
                            keyboardType="numeric"
                          />
                        </>
                      )}
                    </View>
                    <Text style={S.durLabel}>Длительность</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {DURATION_OPTS.map(d => (
                        <Pressable
                          key={d}
                          style={[S.durChip, s.duration === String(d) && S.durChipActive]}
                          onPress={() => updateSelection(s.template.id, { duration: String(d) })}
                        >
                          <Text style={[S.durChipText, s.duration === String(d) && { color: '#fff' }]}>
                            {durationLabel(d)}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                ))}
                <View style={{ height: 16 }} />
              </ScrollView>
            )}

            {/* Footer buttons */}
            <View style={S.footer}>
              {step === 'select' ? (
                <>
                  <Pressable style={S.skipBtn} onPress={onClose}>
                    <Text style={S.skipBtnText}>Пропустить</Text>
                  </Pressable>
                  <Pressable
                    style={[S.nextBtn, (selectedIds.size === 0 && !showCustomForm) && S.nextBtnDisabled]}
                    onPress={selectedIds.size > 0 ? goToPrice : (showCustomForm ? () => setStep('price') : undefined)}
                    disabled={selectedIds.size === 0 && !showCustomForm}
                  >
                    <Text style={S.nextBtnText}>Далее →</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  style={[S.saveBtn, saving && S.nextBtnDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={S.saveBtnText}>
                        Добавить {selections.length + (showCustomForm && customService.name ? 1 : 0)} услуг
                      </Text>
                  }
                </Pressable>
              )}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      <RegionSheet
        visible={regionSheetVisible}
        regions={regions}
        current={currentRegion}
        onSelect={r => { setCurrentRegion(r); loadData(); }}
        onClose={() => setRegionSheetVisible(false)}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#F8F7FF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, maxHeight: '92%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#C8C2E8', alignSelf: 'center', marginBottom: 12 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 8,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: '#1A1628' },

  regionBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#EDE8FF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  regionText: { fontSize: 13, color: '#4A3DB0', fontWeight: '600' },

  center: { height: 200, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#9B92D0', letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  divider: {
    flexDirection: 'row', alignItems: 'center', marginVertical: 12,
  },
  dividerText: { fontSize: 12, color: '#9B92D0', fontWeight: '600' },

  addCustomBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 14, justifyContent: 'center',
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#4A3DB0',
    borderRadius: 12, marginTop: 8,
  },
  addCustomText: { color: '#4A3DB0', fontWeight: '600', fontSize: 14 },

  customForm: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#C8C2E8', marginTop: 8,
  },
  customLabel: { fontSize: 13, fontWeight: '700', color: '#1A1628', marginBottom: 10 },
  removeCustom: { alignSelf: 'flex-end', paddingTop: 8 },
  removeCustomText: { color: '#FF6B6B', fontSize: 13 },

  hint: { fontSize: 12, color: '#B0A8B9', textAlign: 'center', marginTop: 16 },

  priceCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#E8E4F8', marginBottom: 10,
  },
  priceCardName: { fontSize: 15, fontWeight: '700', color: '#1A1628', marginBottom: 2 },
  priceCardRange: { fontSize: 12, color: '#7A7286', marginBottom: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dash: { fontSize: 16, color: '#7A7286' },
  input: {
    height: 46, borderWidth: 1.5, borderColor: '#C8C2E8', borderRadius: 10,
    paddingHorizontal: 12, fontSize: 15, color: '#1A1628', backgroundColor: '#FAFAFA',
  },
  durLabel: { fontSize: 12, color: '#7A7286', marginBottom: 8, fontWeight: '600' },
  durChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#C8C2E8', marginRight: 6, backgroundColor: '#fff',
  },
  durChipActive: { backgroundColor: '#4A3DB0', borderColor: '#4A3DB0' },
  durChipText: { fontSize: 12, color: '#7A7286', fontWeight: '500' },

  footer: {
    flexDirection: 'row', gap: 10, padding: 16,
    borderTopWidth: 1, borderTopColor: '#E8E4F8', backgroundColor: '#F8F7FF',
  },
  skipBtn: {
    flex: 1, height: 50, borderRadius: 12, borderWidth: 1.5,
    borderColor: '#C8C2E8', alignItems: 'center', justifyContent: 'center',
  },
  skipBtnText: { color: '#7A7286', fontWeight: '600' },
  nextBtn: {
    flex: 2, height: 50, borderRadius: 12,
    backgroundColor: '#4A3DB0', alignItems: 'center', justifyContent: 'center',
  },
  nextBtnDisabled: { backgroundColor: '#C8C2E8' },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  saveBtn: {
    flex: 1, height: 50, borderRadius: 12,
    backgroundColor: '#4A3DB0', alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
