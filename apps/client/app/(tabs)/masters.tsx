import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  ActivityIndicator, RefreshControl, Pressable, Image,
  Modal, Animated, Dimensions, ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getSpecialists, toggleFavorite, removeFavorite,
  getMe, getSlots, getCategories, getUpcomingAppointments,
  SpecialistListItem, ServicePreview, Category, SpecialistsFilters, Booking,
} from '@ayla/shared';
import FilterSheet, {
  CatalogFilters, DEFAULT_FILTERS, countActiveFilters,
} from '../../components/FilterSheet';
import SortSheet, { SortOption, sortLabel } from '../../components/SortSheet';

const PAGE_SIZE = 10;
const SCREEN_H = Dimensions.get('window').height;

function todayIso(): string { return new Date().toISOString().split('T')[0]; }
function tomorrowIso(): string {
  const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0];
}
function fmtNextSlot(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function ratingColor(rating: number): string {
  if (rating >= 4) return '#22C55E';
  if (rating >= 3) return '#F59E0B';
  return '#E53935';
}
function fmtBookingDate(date: string, time: string): string {
  const d = new Date(`${date}T${time}`);
  const today = new Date();
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
  if (date === todayIso()) return `Сегодня, ${time}`;
  if (date === tomorrowIso()) return `Завтра, ${time}`;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + ', ' + time;
}

function toApiFilters(f: CatalogFilters, sort: SortOption): SpecialistsFilters {
  return {
    category:    f.category    || undefined,
    price_min:   f.price_min   ? Number(f.price_min)  : undefined,
    price_max:   f.price_max   ? Number(f.price_max)  : undefined,
    rating_min:  f.rating_min  || undefined,
    distance_km: f.distance_km || undefined,
    date:        f.date        || undefined,
    time_of_day: f.time_of_day || undefined,
    sort:        sort !== 'recommended' ? sort : undefined,
  };
}

// ─── AI Entry Point ────────────────────────────────────────────────────────────

function AIEntryCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={S.aiCard} onPress={onPress}>
      <View style={S.aiCardLeft}>
        <View style={S.aiIcon}>
          <Ionicons name="sparkles" size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={S.aiCardTitle}>Ayla AI-ассистент</Text>
          <Text style={S.aiCardSub}>Найду мастера под ваш запрос</Text>
        </View>
      </View>
      <View style={S.aiArrow}>
        <Ionicons name="chevron-forward" size={18} color="#7B61FF" />
      </View>
    </Pressable>
  );
}

// ─── Upcoming appointment card ─────────────────────────────────────────────────

function AppointmentCard({ item, onPress }: { item: Booking; onPress: () => void }) {
  const statusColor: Record<string, string> = {
    confirmed: '#22C55E',
    awaiting_payment: '#F59E0B',
    pending: '#F59E0B',
    in_progress: '#7B61FF',
  };
  const statusLabel: Record<string, string> = {
    confirmed: 'Подтверждено',
    awaiting_payment: 'Ожидает оплаты',
    pending: 'Ожидание',
    in_progress: 'В процессе',
  };
  const color = statusColor[item.status] ?? '#9CA3AF';
  const label = statusLabel[item.status] ?? item.status;

  return (
    <Pressable style={S.apptCard} onPress={onPress}>
      <View style={S.apptAvatar}>
        {item.specialist_avatar ? (
          <Image source={{ uri: item.specialist_avatar }} style={S.apptAvatarImg} />
        ) : (
          <Text style={S.apptAvatarText}>{item.specialist_name[0]}</Text>
        )}
      </View>
      <Text style={S.apptName} numberOfLines={1}>{item.specialist_name}</Text>
      <Text style={S.apptService} numberOfLines={1}>{item.service_name}</Text>
      <Text style={S.apptDate}>{fmtBookingDate(item.date, item.time)}</Text>
      <View style={[S.apptStatus, { borderColor: color }]}>
        <Text style={[S.apptStatusText, { color }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

// ─── Service sheet ────────────────────────────────────────────────────────────

function ServiceSheet({ visible, services, onSelect, onClose }: {
  visible: boolean;
  services: ServicePreview[];
  onSelect: (svc: ServicePreview) => void;
  onClose: () => void;
}) {
  const anim = useRef(new Animated.Value(SCREEN_H)).current;
  useEffect(() => {
    if (visible) Animated.spring(anim, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
    else Animated.timing(anim, { toValue: SCREEN_H, duration: 220, useNativeDriver: true }).start();
  }, [visible, anim]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={S.overlay} onPress={onClose} />
      <Animated.View style={[S.sheet, { transform: [{ translateY: anim }] }]}>
        <View style={S.sheetHandle} />
        <Text style={S.sheetTitle}>Выберите услугу</Text>
        {services.map(svc => (
          <Pressable key={svc.id} style={S.svcItem} onPress={() => onSelect(svc)}>
            <View style={{ flex: 1 }}>
              <Text style={S.svcName}>{svc.name}</Text>
              <Text style={S.svcMeta}>{svc.duration_minutes} мин</Text>
            </View>
            <Text style={S.svcPrice}>{svc.price.toLocaleString('ru-RU')} ₽</Text>
          </Pressable>
        ))}
        <View style={{ height: 20 }} />
      </Animated.View>
    </Modal>
  );
}

// ─── Slot sheet ───────────────────────────────────────────────────────────────

function SlotSheet({ visible, todaySlots, tomorrowSlots, loading, onSelect, onOtherTime, onClose }: {
  visible: boolean;
  todaySlots: string[];
  tomorrowSlots: string[];
  loading: boolean;
  onSelect: (date: string, time: string) => void;
  onOtherTime: () => void;
  onClose: () => void;
}) {
  const anim = useRef(new Animated.Value(SCREEN_H)).current;
  useEffect(() => {
    if (visible) Animated.spring(anim, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
    else Animated.timing(anim, { toValue: SCREEN_H, duration: 220, useNativeDriver: true }).start();
  }, [visible, anim]);

  const today = todayIso();
  const tomorrow = tomorrowIso();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={S.overlay} onPress={onClose} />
      <Animated.View style={[S.sheet, S.slotSheet, { transform: [{ translateY: anim }] }]}>
        <View style={S.sheetHandle} />
        <Text style={S.sheetTitle}>Выберите время</Text>
        {loading ? (
          <View style={S.slotLoading}><ActivityIndicator color="#7B61FF" /></View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {todaySlots.length > 0 && (
              <>
                <Text style={S.slotDayLabel}>Сегодня</Text>
                <View style={S.slotGrid}>
                  {todaySlots.map(t => (
                    <Pressable key={t} style={S.slotChip} onPress={() => onSelect(today, t)}>
                      <Text style={S.slotChipText}>{t}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
            {tomorrowSlots.length > 0 && (
              <>
                <Text style={S.slotDayLabel}>Завтра</Text>
                <View style={S.slotGrid}>
                  {tomorrowSlots.map(t => (
                    <Pressable key={t} style={S.slotChip} onPress={() => onSelect(tomorrow, t)}>
                      <Text style={S.slotChipText}>{t}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
            {todaySlots.length === 0 && tomorrowSlots.length === 0 && (
              <Text style={S.slotEmpty}>Нет доступных слотов на ближайшие 2 дня</Text>
            )}
            <Pressable style={S.otherTimeBtn} onPress={onOtherTime}>
              <Ionicons name="calendar-outline" size={16} color="#7B61FF" />
              <Text style={S.otherTimeTxt}>Другое время</Text>
            </Pressable>
            <View style={{ height: 24 }} />
          </ScrollView>
        )}
      </Animated.View>
    </Modal>
  );
}

// ─── Master card ──────────────────────────────────────────────────────────────

function MasterCard({ item, isFav, onFav, onPress, onQuickBook }: {
  item: SpecialistListItem;
  isFav: boolean;
  onFav: () => void;
  onPress: () => void;
  onQuickBook: () => void;
}) {
  const rColor = ratingColor(item.rating);
  const services = (item.top_services ?? (item.top_service ? [item.top_service] : [])).slice(0, 3);
  const hasSlot = item.next_slot_datetime != null;

  return (
    <Pressable style={S.card} onPress={onPress}>
      <View style={S.cardRow}>
        <View style={S.avatar}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={S.avatarImg} />
          ) : (
            <Text style={S.avatarText}>{item.first_name[0]}</Text>
          )}
        </View>
        <View style={S.cardMeta}>
          <Text style={S.masterName} numberOfLines={1}>
            {item.first_name} {item.last_name}
          </Text>
          <View style={S.metaRow}>
            <Ionicons name="star" size={12} color={rColor} />
            <Text style={[S.ratingText, { color: rColor }]}>{item.rating.toFixed(1)}</Text>
            <Text style={S.reviewsCount}>({item.reviews_count})</Text>
            {item.distance_km != null && (
              <>
                <View style={S.dot} />
                <Ionicons name="location-outline" size={12} color="#9CA3AF" />
                <Text style={S.distanceText}>{item.distance_km.toFixed(1)} км</Text>
              </>
            )}
          </View>
        </View>
        <Pressable onPress={onFav} hitSlop={12} style={S.favBtn}>
          <Ionicons
            name={isFav ? 'heart' : 'heart-outline'}
            size={20}
            color={isFav ? '#E53935' : '#D1D5DB'}
          />
        </Pressable>
      </View>

      {services.length > 0 && (
        <View style={S.servicesList}>
          {services.map((svc, i) => (
            <View key={i} style={S.serviceRow}>
              <Text style={S.serviceRowName} numberOfLines={1}>{svc.name}</Text>
              <Text style={S.serviceRowPrice}>от {svc.price.toLocaleString('ru-RU')} ₽</Text>
            </View>
          ))}
        </View>
      )}

      {hasSlot && (
        <View style={S.qbFooter}>
          <View style={S.qbSlotBadge}>
            <Ionicons name="time-outline" size={12} color="#7B61FF" />
            <Text style={S.qbSlotText}>{fmtNextSlot(item.next_slot_datetime!)}</Text>
          </View>
          <Pressable style={S.qbBtn} onPress={onQuickBook} hitSlop={8}>
            <Text style={S.qbBtnText}>Записаться</Text>
          </Pressable>
        </View>
      )}

      <View style={S.separator} />
    </Pressable>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <View style={S.skeletonCard}>
      <View style={S.skeletonAvatar} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={[S.skeletonLine, { width: '45%', height: 15 }]} />
        <View style={[S.skeletonLine, { width: '30%', height: 12 }]} />
        <View style={[S.skeletonLine, { width: '90%', height: 12, marginTop: 6 }]} />
        <View style={[S.skeletonLine, { width: '80%', height: 12 }]} />
      </View>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();

  const [userName, setUserName] = useState('');
  const [items, setItems] = useState<SpecialistListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [upcomingAppts, setUpcomingAppts] = useState<Booking[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Filters & sort
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortOption>('recommended');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [sortSheetVisible, setSortSheetVisible] = useState(false);

  // Quick booking state
  const [qbItem, setQbItem] = useState<SpecialistListItem | null>(null);
  const [svcSheetVisible, setSvcSheetVisible] = useState(false);
  const [slotSheetVisible, setSlotSheetVisible] = useState(false);
  const [selectedSvc, setSelectedSvc] = useState<ServicePreview | null>(null);
  const [todaySlots, setTodaySlots] = useState<string[]>([]);
  const [tomorrowSlots, setTomorrowSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const isFirstLoad = useRef(true);
  const activeFiltersCount = countActiveFilters(filters);

  useEffect(() => {
    getMe().then(u => {
      const name = [u.first_name, u.last_name ? u.last_name[0] + '.' : ''].filter(Boolean).join(' ');
      setUserName(name || u.phone);
    }).catch(() => {});
    getCategories().then(setCategories).catch(() => {});
    getUpcomingAppointments().then(res => {
      const list = Array.isArray(res) ? res : (res as any).results ?? [];
      setUpcomingAppts(list.slice(0, 5));
    }).catch(() => {});
  }, []);

  const load = useCallback(async (isRefresh = false, f = filters, s = sort) => {
    if (isRefresh) {
      setRefreshing(true);
      getUpcomingAppointments().then(res => {
        const list = Array.isArray(res) ? res : (res as any).results ?? [];
        setUpcomingAppts(list.slice(0, 5));
      }).catch(() => {});
    } else if (isFirstLoad.current) setLoading(true);
    try {
      const data = await getSpecialists(1, PAGE_SIZE, toApiFilters(f, s));
      setItems(data.results);
      setPage(1);
      setHasMore(!!data.next);
      setFavorites(new Set(data.results.filter(sp => sp.is_favorited).map(sp => sp.id)));
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFirstLoad.current = false;
    }
  }, [filters, sort]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const data = await getSpecialists(next, PAGE_SIZE, toApiFilters(filters, sort));
      setItems(prev => {
        const ids = new Set(prev.map(s => s.id));
        return [...prev, ...data.results.filter(s => !ids.has(s.id))];
      });
      setPage(next);
      setHasMore(!!data.next);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleFavorite = async (id: string) => {
    const was = favorites.has(id);
    setFavorites(prev => { const n = new Set(prev); was ? n.delete(id) : n.add(id); return n; });
    try {
      if (was) await removeFavorite(id); else await toggleFavorite(id);
    } catch {
      setFavorites(prev => { const n = new Set(prev); was ? n.add(id) : n.delete(id); return n; });
    }
  };

  const handleApplyFilters = useCallback((newFilters: CatalogFilters) => {
    setFilters(newFilters);
    setFilterSheetVisible(false);
    load(false, newFilters, sort);
  }, [sort, load]);

  const handleSelectSort = useCallback((newSort: SortOption) => {
    setSort(newSort);
    load(false, filters, newSort);
  }, [filters, load]);

  // ── Quick booking ─────────────────────────────────────────────────────────

  const loadSlotsAndOpen = useCallback(async (item: SpecialistListItem, svc: ServicePreview) => {
    setSelectedSvc(svc);
    setLoadingSlots(true);
    setSlotSheetVisible(true);
    try {
      const [ts, tms] = await Promise.all([
        getSlots(item.id, svc.id, todayIso()).catch(() => [] as string[]),
        getSlots(item.id, svc.id, tomorrowIso()).catch(() => [] as string[]),
      ]);
      const allSlots = [
        ...ts.map(t => ({ date: todayIso(), time: t })),
        ...tms.map(t => ({ date: tomorrowIso(), time: t })),
      ];
      if (allSlots.length === 1) {
        setSlotSheetVisible(false);
        const { date, time } = allSlots[0];
        router.push({
          pathname: '/booking/summary',
          params: {
            specialist_id: item.id,
            specialist_name: `${item.first_name} ${item.last_name}`,
            service_id: svc.id,
            service_name: svc.name,
            service_price: String(svc.price),
            service_duration: String(svc.duration_minutes),
            date, time,
          },
        } as any);
        return;
      }
      setTodaySlots(ts);
      setTomorrowSlots(tms);
    } finally {
      setLoadingSlots(false);
    }
  }, [router]);

  const handleQuickBook = useCallback((item: SpecialistListItem) => {
    setQbItem(item);
    const svcs = item.services_preview ?? [];
    if (svcs.length === 0) { router.push(`/profile/${item.id}` as any); return; }
    if (svcs.length === 1) { loadSlotsAndOpen(item, svcs[0]); return; }
    setSvcSheetVisible(true);
  }, [router, loadSlotsAndOpen]);

  const handleServiceSelect = useCallback((svc: ServicePreview) => {
    setSvcSheetVisible(false);
    if (!qbItem) return;
    loadSlotsAndOpen(qbItem, svc);
  }, [qbItem, loadSlotsAndOpen]);

  const handleSlotSelect = useCallback((date: string, time: string) => {
    if (!qbItem || !selectedSvc) return;
    setSlotSheetVisible(false);
    router.push({
      pathname: '/booking/summary',
      params: {
        specialist_id: qbItem.id,
        specialist_name: `${qbItem.first_name} ${qbItem.last_name}`,
        service_id: selectedSvc.id,
        service_name: selectedSvc.name,
        service_price: String(selectedSvc.price),
        service_duration: String(selectedSvc.duration_minutes),
        date, time,
      },
    } as any);
  }, [qbItem, selectedSvc, router]);

  const handleOtherTime = useCallback(() => {
    setSlotSheetVisible(false);
    if (!qbItem || !selectedSvc) return;
    router.push({
      pathname: '/booking/slots',
      params: {
        specialist_id: qbItem.id,
        specialist_name: `${qbItem.first_name} ${qbItem.last_name}`,
        service_id: selectedSvc.id,
        service_name: selectedSvc.name,
        service_price: String(selectedSvc.price),
        service_duration: String(selectedSvc.duration_minutes),
      },
    } as any);
  }, [qbItem, selectedSvc, router]);

  const closeQbSheets = useCallback(() => {
    setSvcSheetVisible(false);
    setSlotSheetVisible(false);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={S.root}>
        <View style={S.header}>
          <View style={[S.skeletonLine, { width: 120, height: 16 }]} />
        </View>
        <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
          <View style={[S.skeletonLine, { height: 68, borderRadius: 16 }]} />
        </View>
        {[1, 2, 3].map(i => <Skeleton key={i} />)}
      </View>
    );
  }

  const q = search.trim().toLowerCase();
  const filtered = q
    ? items.filter(s => {
        const name = `${s.first_name} ${s.last_name}`.toLowerCase();
        const svcs = s.top_services ?? (s.top_service ? [s.top_service] : []);
        return name.includes(q) || svcs.some(sv => sv.name.toLowerCase().includes(q));
      })
    : items;

  return (
    <>
      <FlatList
        style={S.root}
        data={filtered}
        keyExtractor={i => i.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#1A1A1A" />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <>
            {/* Greeting */}
            <View style={S.header}>
              <View style={S.userAvatar}>
                <Text style={S.userAvatarText}>{userName[0] ?? '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.greetLabel}>Добро пожаловать</Text>
                <Text style={S.userName}>{userName || ' '}</Text>
              </View>
            </View>

            {/* AI Entry Point */}
            <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
              <AIEntryCard onPress={() => router.push('/(tabs)/center' as any)} />
            </View>

            {/* Upcoming appointments */}
            {upcomingAppts.length > 0 && (
              <View style={S.section}>
                <View style={S.sectionHeader}>
                  <Text style={S.sectionTitle}>Ближайшие записи</Text>
                  <Pressable onPress={() => router.push('/(tabs)/booking' as any)}>
                    <Text style={S.sectionLink}>Все</Text>
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={S.apptScroll}
                >
                  {upcomingAppts.map(appt => (
                    <AppointmentCard
                      key={appt.id}
                      item={appt}
                      onPress={() => router.push('/(tabs)/booking' as any)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Popular categories */}
            {categories.length > 0 && (
              <View style={S.section}>
                <Text style={S.sectionTitle}>Категории</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={S.catScroll}
                >
                  {categories.map(cat => (
                    <Pressable
                      key={cat.id}
                      style={[
                        S.catChip,
                        filters.category === cat.id && S.catChipActive,
                      ]}
                      onPress={() => {
                        const newCat = filters.category === cat.id ? '' : cat.id;
                        const newFilters = { ...filters, category: newCat };
                        handleApplyFilters(newFilters);
                      }}
                    >
                      {cat.icon && <Text style={S.catIcon}>{cat.icon}</Text>}
                      <Text style={[
                        S.catChipText,
                        filters.category === cat.id && S.catChipTextActive,
                      ]}>
                        {cat.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Search + filter/sort toolbar */}
            <View style={S.sectionTitle2Row}>
              <Text style={S.sectionTitle}>Мастера рядом</Text>
            </View>
            <View style={S.toolbarRow}>
              <View style={S.searchBar}>
                <TextInput
                  style={S.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Поиск мастера или услуги"
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="search"
                />
                <Ionicons name="search-outline" size={18} color="#9CA3AF" />
              </View>

              <Pressable style={S.toolBtn} onPress={() => setFilterSheetVisible(true)}>
                <Ionicons name="options-outline" size={18} color="#fff" />
                {activeFiltersCount > 0 && (
                  <View style={S.badge}>
                    <Text style={S.badgeText}>{activeFiltersCount}</Text>
                  </View>
                )}
              </Pressable>

              <Pressable style={S.sortBtn} onPress={() => setSortSheetVisible(true)}>
                <Ionicons name="swap-vertical-outline" size={16} color="#7B61FF" />
              </Pressable>
            </View>

            {sort !== 'recommended' && (
              <View style={S.sortChipRow}>
                <View style={S.sortChip}>
                  <Text style={S.sortChipText}>{sortLabel(sort)}</Text>
                  <Pressable onPress={() => handleSelectSort('recommended')} hitSlop={6}>
                    <Ionicons name="close-circle" size={14} color="#7B61FF" />
                  </Pressable>
                </View>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={S.empty}>
            <Ionicons name="search-outline" size={48} color="#E5E5E5" />
            <Text style={S.emptyTitle}>
              {search ? 'Ничего не найдено' : activeFiltersCount > 0 ? 'Нет мастеров по фильтрам' : 'Мастеров пока нет'}
            </Text>
            <Text style={S.emptySub}>
              {activeFiltersCount > 0 ? 'Попробуйте изменить фильтры' : 'Попробуйте позже'}
            </Text>
            {activeFiltersCount > 0 && (
              <Pressable style={S.resetFiltersBtn} onPress={() => handleApplyFilters(DEFAULT_FILTERS)}>
                <Text style={S.resetFiltersBtnText}>Сбросить фильтры</Text>
              </Pressable>
            )}
          </View>
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color="#1A1A1A" style={{ margin: 16 }} /> : null}
        renderItem={({ item }) => (
          <MasterCard
            item={item}
            isFav={favorites.has(item.id)}
            onFav={() => handleFavorite(item.id)}
            onPress={() => router.push(`/profile/${item.id}` as any)}
            onQuickBook={() => handleQuickBook(item)}
          />
        )}
      />

      <FilterSheet
        visible={filterSheetVisible}
        categories={categories}
        initialFilters={filters}
        onApply={handleApplyFilters}
        onClose={() => setFilterSheetVisible(false)}
      />

      <SortSheet
        visible={sortSheetVisible}
        current={sort}
        onSelect={handleSelectSort}
        onClose={() => setSortSheetVisible(false)}
      />

      <ServiceSheet
        visible={svcSheetVisible}
        services={qbItem?.services_preview ?? []}
        onSelect={handleServiceSelect}
        onClose={closeQbSheets}
      />

      <SlotSheet
        visible={slotSheetVisible}
        todaySlots={todaySlots}
        tomorrowSlots={tomorrowSlots}
        loading={loadingSlots}
        onSelect={handleSlotSelect}
        onOtherTime={handleOtherTime}
        onClose={closeQbSheets}
      />
    </>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
  },
  userAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E5E5',
    alignItems: 'center', justifyContent: 'center',
  },
  userAvatarText: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  greetLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 1 },
  userName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },

  // AI entry card
  aiCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F2FF',
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: '#E8E0FF',
  },
  aiCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#7B61FF', alignItems: 'center', justifyContent: 'center',
  },
  aiCardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  aiCardSub: { fontSize: 13, color: '#7B61FF' },
  aiArrow: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#EDE8FF', alignItems: 'center', justifyContent: 'center',
  },

  // Sections
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle2Row: { paddingHorizontal: 0, marginTop: 4, marginBottom: 0 },
  sectionLink: { fontSize: 14, fontWeight: '600', color: '#7B61FF' },

  // Appointment cards
  apptScroll: { paddingHorizontal: 16, gap: 12 },
  apptCard: {
    width: 160, backgroundColor: '#fff',
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#F0F0F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  apptAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#E5E5E5', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  apptAvatarImg: { width: 44, height: 44, borderRadius: 22 },
  apptAvatarText: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  apptName: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  apptService: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  apptDate: { fontSize: 11, color: '#9CA3AF', marginBottom: 8 },
  apptStatus: {
    alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  apptStatusText: { fontSize: 11, fontWeight: '600' },

  // Categories
  catScroll: { paddingHorizontal: 16, gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#F5F5F5',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  catChipActive: { backgroundColor: '#F0EDF8', borderColor: '#7B61FF' },
  catIcon: { fontSize: 16 },
  catChipText: { fontSize: 13, fontWeight: '500', color: '#4B5563' },
  catChipTextActive: { color: '#7B61FF', fontWeight: '700' },

  // Toolbar
  toolbarRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 6,
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    height: 44, backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1A1A1A' },
  toolBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#7B61FF',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  sortBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#F0EDF8',
    alignItems: 'center', justifyContent: 'center',
  },

  sortChipRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 },
  sortChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: '#F0EDF8', borderRadius: 20,
  },
  sortChipText: { fontSize: 12, fontWeight: '600', color: '#7B61FF' },

  // Master card
  card: { paddingHorizontal: 16, paddingTop: 14 },
  cardRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#F0F0F0',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden',
  },
  avatarImg: { width: 48, height: 48 },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  favBtn: { padding: 4, flexShrink: 0 },
  cardMeta: { flex: 1, gap: 4 },
  masterName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12, fontWeight: '700' },
  reviewsCount: { fontSize: 12, color: '#9CA3AF' },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#D1D5DB', marginHorizontal: 2 },
  distanceText: { fontSize: 12, color: '#9CA3AF' },
  servicesList: { marginTop: 10, gap: 6 },
  serviceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceRowName: { fontSize: 13, color: '#4B5563', flex: 1, marginRight: 8 },
  serviceRowPrice: { fontSize: 13, fontWeight: '600', color: '#1A1A1A', flexShrink: 0 },
  qbFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  qbSlotBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qbSlotText: { fontSize: 12, color: '#7B61FF', fontWeight: '500' },
  qbBtn: { backgroundColor: '#7B61FF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  qbBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  separator: { height: 1, backgroundColor: '#F0F0F0', marginTop: 14 },

  // Skeleton
  skeletonCard: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  skeletonAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F0F0F0' },
  skeletonLine: { height: 14, borderRadius: 7, backgroundColor: '#F0F0F0' },

  // Empty
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#1A1A1A' },
  emptySub: { fontSize: 14, color: '#9CA3AF' },
  resetFiltersBtn: {
    marginTop: 8, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#7B61FF',
  },
  resetFiltersBtnText: { fontSize: 14, fontWeight: '600', color: '#7B61FF' },

  // Sheets
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 12, paddingHorizontal: 16,
    maxHeight: SCREEN_H * 0.75,
  },
  slotSheet: { maxHeight: SCREEN_H * 0.65 },
  sheetHandle: {
    alignSelf: 'center', width: 40, height: 4,
    borderRadius: 2, backgroundColor: '#E5E5E5', marginBottom: 16,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },
  svcItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  svcName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 2 },
  svcMeta: { fontSize: 13, color: '#9CA3AF' },
  svcPrice: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  slotLoading: { paddingVertical: 40, alignItems: 'center' },
  slotDayLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', marginTop: 8, marginBottom: 8 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E5E5', backgroundColor: '#fff' },
  slotChipText: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  slotEmpty: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingVertical: 24 },
  otherTimeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#7B61FF' },
  otherTimeTxt: { fontSize: 14, fontWeight: '600', color: '#7B61FF' },
});
