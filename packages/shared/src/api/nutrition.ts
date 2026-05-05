import { getApiClient } from './client';
import { IS_MOCK } from './mock';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NutrientData {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface FoodScanResult {
  id: string;
  name: string;
  base: NutrientData;
}

export interface DiaryEntry {
  id: string;
  food_name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  portion_multiplier: number;
  logged_at: string;
  image_url?: string;
}

export interface DiarySummary {
  date: string;
  entries: DiaryEntry[];
  totals: NutrientData;
  goals: NutrientData;
}

export interface VitaminInsight {
  name: string;
  icon: string;
  actual_pct: number;
  recommended_foods: string[];
  beauty_link?: {
    text: string;
    service_name: string;
    specialist_id?: string;
  };
}

export interface WeeklyInsights {
  has_enough_data: boolean;
  deficiencies: VitaminInsight[];
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_GOALS: NutrientData = { calories: 2000, protein: 120, fat: 65, carbs: 250 };

function todayAt(time: string): string {
  const [h, m] = time.split(':');
  const d = new Date();
  d.setHours(+h, +m, 0, 0);
  return d.toISOString();
}

let mockDiaryStore: DiaryEntry[] = [
  {
    id: 'e1', food_name: 'Овсяная каша с бананом',
    calories: 320, protein: 8, fat: 5, carbs: 62,
    portion_multiplier: 1.0, logged_at: todayAt('08:30'),
  },
  {
    id: 'e2', food_name: 'Куриная грудка с рисом',
    calories: 480, protein: 42, fat: 8, carbs: 55,
    portion_multiplier: 1.0, logged_at: todayAt('13:00'),
  },
];

const MOCK_SCAN_RESULTS: FoodScanResult[] = [
  { id: 'f1', name: 'Пицца Маргарита',      base: { calories: 266, protein: 11, fat: 10, carbs: 33 } },
  { id: 'f2', name: 'Греческий салат',       base: { calories: 180, protein: 5,  fat: 14, carbs: 10 } },
  { id: 'f3', name: 'Борщ',                  base: { calories: 95,  protein: 4,  fat: 3,  carbs: 14 } },
  { id: 'f4', name: 'Гречневая каша',        base: { calories: 313, protein: 12, fat: 4,  carbs: 62 } },
  { id: 'f5', name: 'Творог 5%',             base: { calories: 121, protein: 17, fat: 5,  carbs: 3  } },
  { id: 'f6', name: 'Лосось с овощами',      base: { calories: 250, protein: 28, fat: 13, carbs: 5  } },
];

const MOCK_INSIGHTS: WeeklyInsights = {
  has_enough_data: true,
  deficiencies: [
    {
      name: 'Витамин C', icon: '🍊', actual_pct: 45,
      recommended_foods: ['Апельсин', 'Клубника', 'Брокколи', 'Шиповник'],
      beauty_link: { text: 'Влияет на упругость кожи', service_name: 'Уход за лицом', specialist_id: '8' },
    },
    {
      name: 'Омега-3', icon: '🐟', actual_pct: 30,
      recommended_foods: ['Лосось', 'Грецкие орехи', 'Семена льна', 'Сельдь'],
      beauty_link: { text: 'Придаёт волосам блеск', service_name: 'Уход за волосами', specialist_id: '4' },
    },
    {
      name: 'Витамин D', icon: '☀️', actual_pct: 60,
      recommended_foods: ['Яйца', 'Жирная рыба', 'Грибы'],
    },
  ],
};

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function calcTotals(entries: DiaryEntry[]): NutrientData {
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein:  acc.protein  + e.protein,
      fat:      acc.fat      + e.fat,
      carbs:    acc.carbs    + e.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 },
  );
}

// ─── API ──────────────────────────────────────────────────────────────────────

export async function getDiary(date: string): Promise<DiarySummary> {
  if (IS_MOCK) {
    await delay(250);
    const today = new Date().toISOString().split('T')[0];
    const entries = date === today ? [...mockDiaryStore] : [];
    return { date, entries, totals: calcTotals(entries), goals: MOCK_GOALS };
  }
  const api = getApiClient();
  const { data } = await api.get(`/nutrition/diary/?date=${date}`);
  return data;
}

export async function scanFood(imageUri: string): Promise<FoodScanResult> {
  if (IS_MOCK) {
    await delay(1800);
    return MOCK_SCAN_RESULTS[Math.floor(Math.random() * MOCK_SCAN_RESULTS.length)];
  }
  const api = getApiClient();
  const formData = new FormData();
  formData.append('image', { uri: imageUri, type: 'image/jpeg', name: 'food.jpg' } as any);
  const { data } = await api.post('/nutrition/scan/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function logFood(scanId: string, portionMultiplier: number): Promise<DiaryEntry> {
  if (IS_MOCK) {
    await delay(300);
    const scan = MOCK_SCAN_RESULTS.find(s => s.id === scanId) ?? MOCK_SCAN_RESULTS[0];
    const m = portionMultiplier;
    const entry: DiaryEntry = {
      id: `e${Date.now()}`,
      food_name: scan.name,
      calories:  Math.round(scan.base.calories * m),
      protein:   Math.round(scan.base.protein  * m * 10) / 10,
      fat:       Math.round(scan.base.fat      * m * 10) / 10,
      carbs:     Math.round(scan.base.carbs    * m * 10) / 10,
      portion_multiplier: m,
      logged_at: new Date().toISOString(),
    };
    mockDiaryStore = [...mockDiaryStore, entry];
    return entry;
  }
  const api = getApiClient();
  const { data } = await api.post('/nutrition/log/', { scan_id: scanId, portion_multiplier: portionMultiplier });
  return data;
}

export async function deleteLog(id: string): Promise<void> {
  if (IS_MOCK) {
    await delay(150);
    mockDiaryStore = mockDiaryStore.filter(e => e.id !== id);
    return;
  }
  const api = getApiClient();
  await api.delete(`/nutrition/log/${id}/`);
}

export async function getInsights(): Promise<WeeklyInsights> {
  if (IS_MOCK) {
    await delay(300);
    return MOCK_INSIGHTS;
  }
  const api = getApiClient();
  const { data } = await api.get('/nutrition/insights/');
  return data;
}
