import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  Image, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getMasterDetail, getMasterServices, getMasterReviews, toggleFavorite, removeFavorite,
  MasterDetail, MasterService, MasterReview,
} from '@beautygo/shared';

const CATEGORY_LABELS: Record<string, string> = {
  hair: 'Волосы', nails: 'Маникюр', brows: 'Брови / ресницы',
  makeup: 'Макияж', massage: 'Массаж', cosmetology: 'Косметология',
  waxing: 'Депиляция', other: 'Другое',
};

function Stars({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={rating >= i ? 'star' : rating >= i - 0.5 ? 'star-half' : 'star-outline'}
          size={14}
          color="#FFBC00"
        />
      ))}
    </View>
  );
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h}ч ${m}м`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Группировка услуг по категории
function groupByCategory(services: MasterService[]) {
  const map: Record<string, MasterService[]> = {};
  for (const svc of services) {
    if (!map[svc.category]) map[svc.category] = [];
    map[svc.category].push(svc);
  }
  return Object.entries(map);
}

export default function MasterProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [master, setMaster] = useState<MasterDetail | null>(null);
  const [services, setServices] = useState<MasterService[]>([]);
  const [reviews, setReviews] = useState<MasterReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [bioNeedsExpand, setBioNeedsExpand] = useState(false);

  const heartScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getMasterDetail(id),
      getMasterServices(id),
      getMasterReviews(id),
    ])
      .then(([m, s, r]) => {
        setMaster(m);
        setServices(s);
        setReviews(r);
      })
      .catch(() => Alert.alert('Ошибка', 'Не удалось загрузить профиль'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleFavorite = async () => {
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.35, useNativeDriver: true, speed: 40 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, speed: 40 }),
    ]).start();
    const next = !isFavorite;
    setIsFavorite(next);
    try {
      if (next) await toggleFavorite(id!);
      else await removeFavorite(id!);
    } catch {
      setIsFavorite(!next);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#7B61FF" />
      </View>
    );
  }

  if (!master) return null;

  const serviceGroups = groupByCategory(services);
  const topReviews = reviews.slice(0, 3);

  return (
    <View testID="master-profile-screen" style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── ШАПКА ── */}
        <View style={styles.header}>
          {/* Кнопка назад */}
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#1A1628" />
          </Pressable>

          {/* Аватар */}
          <View style={styles.avatarWrap}>
            {master.avatar_url ? (
              <Image source={{ uri: master.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>
                  {master.first_name[0]}{master.last_name[0]}
                </Text>
              </View>
            )}
          </View>

          {/* Избранное */}
          <Animated.View style={[styles.favoriteBtn, { transform: [{ scale: heartScale }] }]}>
            <Pressable onPress={handleFavorite} hitSlop={10}>
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={26}
                color={isFavorite ? '#FF4B6E' : '#1A1628'}
              />
            </Pressable>
          </Animated.View>
        </View>

        {/* ── ИНФО ── */}
        <View style={styles.infoBlock}>
          <Text style={styles.masterName}>
            {master.first_name} {master.last_name}
          </Text>

          <View style={styles.metaRow}>
            <Stars rating={master.rating} />
            <Text style={styles.rating}>{master.rating.toFixed(1)}</Text>
            <Text style={styles.reviewsCount}>({master.reviews_count} отзывов)</Text>
            {master.distance_km != null && (
              <>
                <View style={styles.dot} />
                <Ionicons name="location-outline" size={13} color="#7A7286" />
                <Text style={styles.distance}>{master.distance_km} км</Text>
              </>
            )}
          </View>

          {master.address && (
            <View style={styles.addressRow}>
              <Ionicons name="map-outline" size={14} color="#7A7286" />
              <Text style={styles.address}>{master.address}</Text>
            </View>
          )}
        </View>

        {/* ── BIO ── */}
        {master.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>О мастере</Text>
            <Text
              style={styles.bioText}
              numberOfLines={bioExpanded ? undefined : 3}
              onTextLayout={(e) => {
                if (e.nativeEvent.lines.length > 3) setBioNeedsExpand(true);
              }}
            >
              {master.bio}
            </Text>
            {bioNeedsExpand && (
              <Pressable onPress={() => setBioExpanded((v) => !v)} style={styles.expandBtn}>
                <Text style={styles.expandText}>
                  {bioExpanded ? 'Свернуть' : 'Читать полностью'}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* ── ПОРТФОЛИО ── */}
        {master.portfolio.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Портфолио</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.portfolioRow}
            >
              {master.portfolio.map((item) => (
                <View key={item.id} style={styles.portfolioItem}>
                  {item.photo_url ? (
                    <Image source={{ uri: item.photo_url }} style={styles.portfolioImg} />
                  ) : (
                    <View style={[styles.portfolioImg, styles.portfolioPlaceholder]}>
                      <Ionicons name="image-outline" size={28} color="#C8C2E8" />
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── УСЛУГИ ── */}
        {serviceGroups.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Услуги</Text>
            {serviceGroups.map(([category, items]) => (
              <View key={category} style={styles.categoryBlock}>
                <Text style={styles.categoryLabel}>
                  {CATEGORY_LABELS[category] ?? category}
                </Text>
                {items.map((svc) => (
                  <Pressable
                    key={svc.id}
                    style={styles.serviceRow}
                    onPress={() => router.push({
                      pathname: '/booking/slots',
                      params: {
                        specialist_id: id!,
                        specialist_name: `${master.first_name} ${master.last_name}`,
                        service_id: svc.id,
                        service_name: svc.name,
                        service_price: String(svc.price),
                        service_duration: String(svc.duration_minutes),
                      },
                    } as any)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.serviceName}>{svc.name}</Text>
                      <Text style={styles.serviceDuration}>{formatDuration(svc.duration_minutes)}</Text>
                    </View>
                    <Text style={styles.servicePrice}>{svc.price.toLocaleString('ru-RU')} ₽</Text>
                    <Ionicons name="chevron-forward" size={16} color="#C8C2E8" style={{ marginLeft: 6 }} />
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* ── ОТЗЫВЫ ── */}
        {topReviews.length > 0 && (
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Отзывы</Text>
              {reviews.length > 3 && (
                <Pressable>
                  <Text style={styles.showAllText}>Показать все ({reviews.length})</Text>
                </Pressable>
              )}
            </View>
            {topReviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>{review.author_name[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewAuthor}>{review.author_name}</Text>
                    <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
                  </View>
                  <Stars rating={review.rating} />
                </View>
                <Text style={styles.reviewText}>{review.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Отступ под sticky кнопку */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── STICKY КНОПКИ ── */}
      <View style={styles.bookingBar}>
        <Pressable
          style={styles.reviewBtn}
          onPress={() => router.push({
            pathname: '/review/[id]',
            params: {
              id: id!,
              master_name: `${master.first_name} ${master.last_name}`,
            },
          } as any)}
        >
          <Ionicons name="star-outline" size={18} color="#1A1A1A" />
          <Text style={styles.reviewBtnText}>Отзыв</Text>
        </Pressable>
        <Pressable
          testID="booking-btn"
          style={styles.bookingBtn}
          onPress={() => {
            const svc = services[0];
            if (!svc) return Alert.alert('', 'У мастера нет доступных услуг');
            router.push({
              pathname: '/booking/slots',
              params: {
                specialist_id: id!,
                specialist_name: `${master.first_name} ${master.last_name}`,
                service_id: svc.id,
                service_name: svc.name,
                service_price: String(svc.price),
                service_duration: String(svc.duration_minutes),
              },
            } as any);
          }}
        >
          <Text style={styles.bookingBtnText}>Записаться</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1 },
  content: { paddingBottom: 16 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Шапка
  header: {
    height: 280,
    backgroundColor: '#F0EDF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    position: 'absolute', top: 52, left: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
  },
  favoriteBtn: {
    position: 'absolute', top: 52, right: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
  },
  avatarWrap: {
    shadowColor: '#7B61FF', shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
  },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#fff' },
  avatarPlaceholder: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#EDE8FF', borderWidth: 3, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: 36, fontWeight: '700', color: '#7B61FF' },

  // Инфо
  infoBlock: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  masterName: { fontSize: 22, fontWeight: '700', color: '#1A1628', marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6, flexWrap: 'wrap' },
  rating: { fontSize: 14, fontWeight: '600', color: '#1A1628' },
  reviewsCount: { fontSize: 13, color: '#7A7286' },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#C8C2E8' },
  distance: { fontSize: 13, color: '#7A7286' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  address: { fontSize: 13, color: '#7A7286' },

  // Секции
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1628', marginBottom: 12 },

  // Bio
  bioText: { fontSize: 14, color: '#4A4358', lineHeight: 22 },
  expandBtn: { marginTop: 6 },
  expandText: { fontSize: 14, color: '#7B61FF', fontWeight: '600' },

  // Портфолио
  portfolioRow: { gap: 10, paddingRight: 20 },
  portfolioItem: {},
  portfolioImg: { width: 120, height: 120, borderRadius: 12 },
  portfolioPlaceholder: {
    backgroundColor: '#F0EDF8', alignItems: 'center', justifyContent: 'center',
  },

  // Услуги
  categoryBlock: { marginBottom: 16 },
  categoryLabel: {
    fontSize: 13, fontWeight: '600', color: '#7A7286',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  serviceRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0EDF8',
  },
  serviceName: { fontSize: 15, color: '#1A1628', fontWeight: '500', marginBottom: 2 },
  serviceDuration: { fontSize: 13, color: '#7A7286' },
  servicePrice: { fontSize: 16, fontWeight: '700', color: '#7B61FF' },

  // Отзывы
  reviewsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  showAllText: { fontSize: 14, color: '#7B61FF', fontWeight: '600' },
  reviewCard: {
    backgroundColor: '#F8F7FF', borderRadius: 14, padding: 14, marginBottom: 10,
  },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#EDE8FF', alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { fontSize: 15, fontWeight: '700', color: '#7B61FF' },
  reviewAuthor: { fontSize: 14, fontWeight: '600', color: '#1A1628' },
  reviewDate: { fontSize: 12, color: '#7A7286', marginTop: 1 },
  reviewText: { fontSize: 14, color: '#4A4358', lineHeight: 20 },

  // Sticky кнопка
  bookingBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingBottom: 34, paddingTop: 14,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#F0EDF8',
    shadowColor: '#7B61FF', shadowOpacity: 0.08, shadowRadius: 12, elevation: 10,
  },
  reviewBtn: {
    height: 50, paddingHorizontal: 18, borderRadius: 25,
    borderWidth: 1.5, borderColor: '#1A1A1A',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  reviewBtnText: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  bookingBtn: {
    flex: 1, height: 50, borderRadius: 25,
    backgroundColor: '#7B61FF', alignItems: 'center', justifyContent: 'center',
  },
  bookingBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
