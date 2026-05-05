import { getApiClient } from './client';
import { IS_MOCK } from './mock';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ServiceTemplate {
  id: string;
  name: string;
  category: string;
  price_min: number;
  price_max: number;
  duration_minutes: number;
  is_popular: boolean;
}

export interface ServiceRegion {
  id: string;
  name: string;
}

export interface TemplateServiceCreate {
  template_id?: string;
  name: string;
  price_min: number;
  price_max: number;
  duration_minutes: number;
  category: string;
}

// ─── Mock ─────────────────────────────────────────────────────────────────────

const MOCK_REGIONS: ServiceRegion[] = [
  { id: 'msc', name: 'Москва' },
  { id: 'spb', name: 'Санкт-Петербург' },
  { id: 'pnz', name: 'Пенза' },
  { id: 'kzn', name: 'Казань' },
  { id: 'krd', name: 'Краснодар' },
];

const MOCK_TEMPLATES: ServiceTemplate[] = [
  // Маникюр
  { id: 't1',  name: 'Классический маникюр',     category: 'nails',       price_min: 600,  price_max: 1000, duration_minutes: 60,  is_popular: true },
  { id: 't2',  name: 'Маникюр + гель-лак',        category: 'nails',       price_min: 1000, price_max: 1600, duration_minutes: 90,  is_popular: true },
  { id: 't3',  name: 'Аппаратный маникюр',        category: 'nails',       price_min: 800,  price_max: 1200, duration_minutes: 75,  is_popular: true },
  { id: 't4',  name: 'Наращивание (гель)',         category: 'nails',       price_min: 2000, price_max: 3500, duration_minutes: 120, is_popular: false },
  { id: 't5',  name: 'Наращивание (акрил)',        category: 'nails',       price_min: 1800, price_max: 3000, duration_minutes: 120, is_popular: false },
  { id: 't6',  name: 'Дизайн ногтей (1 палец)',   category: 'nails',       price_min: 100,  price_max: 300,  duration_minutes: 15,  is_popular: false },
  // Волосы
  { id: 't7',  name: 'Стрижка женская',           category: 'hair',        price_min: 800,  price_max: 2000, duration_minutes: 60,  is_popular: true },
  { id: 't8',  name: 'Окрашивание волос',         category: 'hair',        price_min: 3000, price_max: 6000, duration_minutes: 120, is_popular: true },
  { id: 't9',  name: 'Балаяж',                    category: 'hair',        price_min: 4000, price_max: 8000, duration_minutes: 180, is_popular: true },
  { id: 't10', name: 'Укладка',                   category: 'hair',        price_min: 500,  price_max: 1500, duration_minutes: 45,  is_popular: false },
  // Брови
  { id: 't11', name: 'Коррекция бровей',          category: 'brows',       price_min: 400,  price_max: 800,  duration_minutes: 30,  is_popular: true },
  { id: 't12', name: 'Окрашивание бровей',        category: 'brows',       price_min: 600,  price_max: 1000, duration_minutes: 30,  is_popular: true },
  { id: 't13', name: 'Ламинирование ресниц',      category: 'brows',       price_min: 1500, price_max: 2500, duration_minutes: 60,  is_popular: false },
  // Косметология
  { id: 't14', name: 'Чистка лица',               category: 'cosmetology', price_min: 1500, price_max: 3000, duration_minutes: 90,  is_popular: true },
  { id: 't15', name: 'Пилинг',                    category: 'cosmetology', price_min: 2000, price_max: 4000, duration_minutes: 60,  is_popular: true },
  // Массаж
  { id: 't16', name: 'Классический массаж спины', category: 'massage',     price_min: 1000, price_max: 2000, duration_minutes: 60,  is_popular: true },
  { id: 't17', name: 'Антицеллюлитный массаж',    category: 'massage',     price_min: 1500, price_max: 3000, duration_minutes: 60,  is_popular: true },
];

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─── API ──────────────────────────────────────────────────────────────────────

export async function getTemplates(params: {
  category?: string;
  lat?: number;
  lon?: number;
  region_id?: string;
}): Promise<ServiceTemplate[]> {
  if (IS_MOCK) {
    await delay(400);
    if (params.category) return MOCK_TEMPLATES.filter(t => t.category === params.category);
    return MOCK_TEMPLATES;
  }
  const api = getApiClient();
  const query = new URLSearchParams();
  if (params.category)  query.set('category_id', params.category);
  if (params.lat)       query.set('lat', String(params.lat));
  if (params.lon)       query.set('lon', String(params.lon));
  if (params.region_id) query.set('region_id', params.region_id);
  const { data } = await api.get(`/service-templates/?${query}`);
  return data;
}

export async function getRegions(): Promise<ServiceRegion[]> {
  if (IS_MOCK) {
    await delay(200);
    return MOCK_REGIONS;
  }
  const api = getApiClient();
  const { data } = await api.get('/service-templates/regions/');
  return data;
}

export async function createServiceFromTemplate(payload: TemplateServiceCreate): Promise<void> {
  if (IS_MOCK) {
    await delay(250);
    return;
  }
  const api = getApiClient();
  await api.post('/services/', payload);
}
