import { getApiClient } from './client';
import { IS_MOCK } from './mock';

// ─── Specialists feed ─────────────────────────────────────────────────────────

export interface SpecialistListItem {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  rating: number;
  reviews_count: number;
  distance_km?: number;
  top_service?: {
    name: string;
    price: number;
    duration_minutes: number;
  };
  top_services?: Array<{
    name: string;
    price: number;
    duration_minutes: number;
  }>;
  is_favorited?: boolean;
}

export interface SpecialistsPage {
  results: SpecialistListItem[];
  count: number;
  next: string | null;
}

const mockSpecialists: SpecialistListItem[] = [
  {
    id: '1', first_name: 'Мария', last_name: 'Иванова', rating: 4.8, reviews_count: 134, distance_km: 0.8,
    top_service: { name: 'Маникюр с гель-лаком', price: 1800, duration_minutes: 90 },
    top_services: [
      { name: 'Маникюр с гель-лаком', price: 1800, duration_minutes: 90 },
      { name: 'Маникюр классический', price: 1200, duration_minutes: 60 },
      { name: 'Педикюр', price: 1500, duration_minutes: 75 },
    ],
  },
  {
    id: '2', first_name: 'Ольга', last_name: 'Смирнова', rating: 4.9, reviews_count: 87, distance_km: 1.2,
    top_service: { name: 'Массаж спины', price: 2500, duration_minutes: 60 },
    top_services: [
      { name: 'Массаж спины', price: 2500, duration_minutes: 60 },
      { name: 'Массаж шеи и плеч', price: 1500, duration_minutes: 40 },
      { name: 'Массаж всего тела', price: 4000, duration_minutes: 90 },
    ],
  },
  {
    id: '3', first_name: 'Анна', last_name: 'Петрова', rating: 4.7, reviews_count: 52, distance_km: 2.1,
    top_service: { name: 'Стрижка и укладка', price: 1500, duration_minutes: 75 },
    top_services: [
      { name: 'Стрижка и укладка', price: 1500, duration_minutes: 75 },
      { name: 'Окрашивание', price: 3500, duration_minutes: 120 },
      { name: 'Ламинирование волос', price: 2000, duration_minutes: 90 },
    ],
  },
  {
    id: '4', first_name: 'Елена', last_name: 'Козлова', rating: 5.0, reviews_count: 210, distance_km: 0.5,
    top_service: { name: 'Коррекция бровей', price: 800, duration_minutes: 45 },
    top_services: [
      { name: 'Коррекция бровей', price: 800, duration_minutes: 45 },
      { name: 'Ламинирование бровей', price: 1400, duration_minutes: 60 },
      { name: 'Перманентный макияж', price: 5000, duration_minutes: 120 },
    ],
  },
  {
    id: '5', first_name: 'Наталья', last_name: 'Морозова', rating: 4.6, reviews_count: 63, distance_km: 3.4,
    top_service: { name: 'Ламинирование ресниц', price: 1200, duration_minutes: 60 },
    top_services: [
      { name: 'Ламинирование ресниц', price: 1200, duration_minutes: 60 },
      { name: 'Наращивание ресниц', price: 2500, duration_minutes: 120 },
      { name: 'Биозавивка ресниц', price: 1800, duration_minutes: 90 },
    ],
  },
  {
    id: '6', first_name: 'Светлана', last_name: 'Новикова', rating: 4.8, reviews_count: 99, distance_km: 1.7,
    top_service: { name: 'Педикюр с покрытием', price: 1600, duration_minutes: 80 },
    top_services: [
      { name: 'Педикюр с покрытием', price: 1600, duration_minutes: 80 },
      { name: 'Аппаратный педикюр', price: 2200, duration_minutes: 90 },
      { name: 'СПА-педикюр', price: 2800, duration_minutes: 100 },
    ],
  },
  {
    id: '7', first_name: 'Татьяна', last_name: 'Соколова', rating: 4.5, reviews_count: 41, distance_km: 4.0,
    top_service: { name: 'Восковая депиляция', price: 900, duration_minutes: 40 },
    top_services: [
      { name: 'Восковая депиляция', price: 900, duration_minutes: 40 },
      { name: 'Шугаринг', price: 1100, duration_minutes: 45 },
      { name: 'Лазерная эпиляция', price: 2000, duration_minutes: 30 },
    ],
  },
  {
    id: '8', first_name: 'Дарья', last_name: 'Федорова', rating: 4.9, reviews_count: 175, distance_km: 0.9,
    top_service: { name: 'Макияж дневной', price: 2000, duration_minutes: 60 },
    top_services: [
      { name: 'Макияж дневной', price: 2000, duration_minutes: 60 },
      { name: 'Макияж вечерний', price: 3500, duration_minutes: 90 },
      { name: 'Свадебный макияж', price: 6000, duration_minutes: 120 },
    ],
  },
];

export const getSpecialists = async (page = 1, pageSize = 10): Promise<SpecialistsPage> => {
  if (IS_MOCK) {
    const start = (page - 1) * pageSize;
    const results = mockSpecialists.slice(start, start + pageSize).map(s => ({
      ...s,
      is_favorited: mockFavoritesStore.has(s.id),
    }));
    return { results, count: mockSpecialists.length, next: start + pageSize < mockSpecialists.length ? 'next' : null };
  }
  const api = getApiClient();
  const { data } = await api.get<SpecialistsPage>(`/specialists/?page=${page}&page_size=${pageSize}`);
  return data;
};

// In-memory store для mock-режима — общий на всё приложение
const mockFavoritesStore = new Set<string>();

export interface MasterDetail {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  bio?: string;
  rating: number;
  reviews_count: number;
  distance_km?: number;
  address?: string;
  portfolio: Array<{ id: string; photo_url: string }>;
  is_favorited?: boolean;
}

export interface MasterService {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  category: string;
}

export interface MasterReview {
  id: string;
  author_name: string;
  author_avatar?: string;
  rating: number;
  text: string;
  created_at: string;
}

// — MOCK DATA —
const mockMaster: MasterDetail = {
  id: '1',
  first_name: 'Мария',
  last_name: 'Иванова',
  bio: 'Профессиональный мастер маникюра с 7-летним опытом. Специализируюсь на современных техниках: гель-лак, акрил, наращивание. Слежу за тенденциями и регулярно повышаю квалификацию на курсах.',
  rating: 4.8,
  reviews_count: 134,
  distance_km: 1.2,
  address: 'ул. Садовая, 15',
  portfolio: [
    { id: 'p1', photo_url: '' },
    { id: 'p2', photo_url: '' },
    { id: 'p3', photo_url: '' },
    { id: 'p4', photo_url: '' },
  ],
};

const mockServices: MasterService[] = [
  { id: 's1', name: 'Маникюр классический', price: 1200, duration_minutes: 60, category: 'nails' },
  { id: 's2', name: 'Маникюр с гель-лаком', price: 1800, duration_minutes: 90, category: 'nails' },
  { id: 's3', name: 'Педикюр', price: 1500, duration_minutes: 75, category: 'nails' },
  { id: 's4', name: 'Наращивание ногтей', price: 3000, duration_minutes: 120, category: 'nails' },
];

const mockReviews: MasterReview[] = [
  {
    id: 'r1',
    author_name: 'Анна К.',
    rating: 5,
    text: 'Мария — настоящий профессионал! Работа аккуратная, результат держится долго.',
    created_at: '2026-03-10T10:00:00Z',
  },
  {
    id: 'r2',
    author_name: 'Елена М.',
    rating: 5,
    text: 'Очень довольна результатом, буду возвращаться снова.',
    created_at: '2026-03-05T14:30:00Z',
  },
  {
    id: 'r3',
    author_name: 'Ольга П.',
    rating: 4,
    text: 'Хорошая работа, чисто и аккуратно. Рекомендую.',
    created_at: '2026-02-28T09:00:00Z',
  },
];

export const getMasterDetail = async (id: string): Promise<MasterDetail> => {
  if (IS_MOCK) return { ...mockMaster, id };
  const api = getApiClient();
  const { data } = await api.get<MasterDetail>(`/specialists/${id}/`);
  return data;
};

export const getMasterServices = async (specialistId: string): Promise<MasterService[]> => {
  if (IS_MOCK) return mockServices;
  const api = getApiClient();
  const { data } = await api.get<MasterService[]>(`/services/?specialist=${specialistId}`);
  return data;
};

export const getMasterReviews = async (specialistId: string): Promise<MasterReview[]> => {
  if (IS_MOCK) return mockReviews;
  const api = getApiClient();
  const { data } = await api.get<MasterReview[]>(`/reviews/?specialist=${specialistId}`);
  return data;
};

export const toggleFavorite = async (specialistId: string): Promise<void> => {
  if (IS_MOCK) { mockFavoritesStore.add(specialistId); return; }
  const api = getApiClient();
  await api.post(`/favorites/specialists/${specialistId}`);
};

export const removeFavorite = async (specialistId: string): Promise<void> => {
  if (IS_MOCK) { mockFavoritesStore.delete(specialistId); return; }
  const api = getApiClient();
  await api.delete(`/favorites/specialists/${specialistId}`);
};

export const getFavorites = async (): Promise<MasterDetail[]> => {
  if (IS_MOCK) {
    const allMasters: MasterDetail[] = [
      { ...mockMaster, id: '1', first_name: 'Мария', last_name: 'Иванова' },
      { ...mockMaster, id: '2', first_name: 'Ольга', last_name: 'Смирнова', rating: 4.9, reviews_count: 87 },
      { ...mockMaster, id: '3', first_name: 'Анна', last_name: 'Петрова', rating: 4.7, reviews_count: 52 },
      { ...mockMaster, id: '4', first_name: 'Елена', last_name: 'Козлова', rating: 5.0, reviews_count: 210 },
    ];
    return allMasters.filter(m => mockFavoritesStore.has(m.id));
  }
  const api = getApiClient();
  const { data } = await api.get<{ results: MasterDetail[] }>('/favorites/specialists');
  return data.results;
};

export const isMasterFavorited = (specialistId: string): boolean =>
  IS_MOCK ? mockFavoritesStore.has(specialistId) : false;
