import { getApiClient } from './client';
import { IS_MOCK } from './mock';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PortfolioPhoto {
  id: string;
  photo_url: string;
}

// ─── Mock ─────────────────────────────────────────────────────────────────────

let mockStore: PortfolioPhoto[] = [
  { id: 'pp1', photo_url: '' },
  { id: 'pp2', photo_url: '' },
  { id: 'pp3', photo_url: '' },
  { id: 'pp4', photo_url: '' },
];

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─── API ──────────────────────────────────────────────────────────────────────

export async function getPortfolio(): Promise<PortfolioPhoto[]> {
  if (IS_MOCK) {
    await delay(300);
    return [...mockStore];
  }
  const api = getApiClient();
  const { data } = await api.get('/specialists/me/portfolio/');
  return data;
}

export async function uploadPortfolioPhoto(
  imageUri: string,
  onProgress?: (pct: number) => void,
): Promise<PortfolioPhoto> {
  if (IS_MOCK) {
    for (const pct of [20, 50, 80, 100]) {
      await delay(300);
      onProgress?.(pct);
    }
    const photo: PortfolioPhoto = { id: `pp${Date.now()}`, photo_url: imageUri };
    mockStore = [...mockStore, photo];
    return photo;
  }
  const api = getApiClient();
  const formData = new FormData();
  formData.append('photo', { uri: imageUri, type: 'image/jpeg', name: 'portfolio.jpg' } as any);
  const { data } = await api.post('/specialists/me/portfolio/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e: any) => {
      if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100));
    },
  });
  return data;
}

export async function deletePortfolioPhoto(id: string): Promise<void> {
  if (IS_MOCK) {
    await delay(200);
    mockStore = mockStore.filter(p => p.id !== id);
    return;
  }
  const api = getApiClient();
  await api.delete(`/specialists/me/portfolio/${id}/`);
}
