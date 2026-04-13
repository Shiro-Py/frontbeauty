/** @jest-environment node */
/**
 * API Contract Tests — Specialists
 */

// Отключаем mock-режим
jest.mock('../../../../packages/shared/src/api/mock', () => ({
  IS_MOCK: false,
  MOCK_CODE: '123456',
  mockVerifyResponse: () => ({}),
  mockProfile: {},
}));

// tokenStorage: возвращаем реальные тестовые токены
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => {
    if (key === 'ACCESS_TOKEN') return Promise.resolve('test-access-token');
    if (key === 'DEVICE_ID') return Promise.resolve('test-device-id');
    return Promise.resolve(null);
  }),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { initializeApiClient } from '../../../../packages/shared/src/api/client';
import { getSpecialists, toggleFavorite, removeFavorite } from '../../../../packages/shared/src/api/masters';

const BASE = 'https://dev.gobeauty.site/api/v1';

// Сохраняем только нужные поля — Request содержит циклические ссылки
interface CapturedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
}

let lastRequest: CapturedRequest | null = null;

function capture(request: Request): CapturedRequest {
  return {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
  };
}

const mockResults = [
  { id: '1', first_name: 'Мария', last_name: 'Иванова', rating: 4.8, reviews_count: 10 },
  { id: '2', first_name: 'Ольга', last_name: 'Смирнова', rating: 4.2, reviews_count: 5 },
];

const server = setupServer(
  http.get(`${BASE}/specialists/`, ({ request }) => {
    lastRequest = capture(request);
    return HttpResponse.json({ results: mockResults, count: 2, next: null });
  }),

  http.post(`${BASE}/favorites/specialists/:id`, ({ request }) => {
    lastRequest = capture(request);
    return HttpResponse.json({ ok: true });
  }),

  http.delete(`${BASE}/favorites/specialists/:id`, ({ request }) => {
    lastRequest = capture(request);
    return new HttpResponse(null, { status: 204 });
  }),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
  initializeApiClient('client');
});
afterEach(() => {
  server.resetHandlers();
  lastRequest = null;
});
afterAll(() => server.close());

describe('Specialists API Contract', () => {
  it('GET /specialists/ отправляет X-App-Type: client', async () => {
    await getSpecialists(1, 10);
    expect(lastRequest!.headers['x-app-type']).toBe('client');
  });

  it('GET /specialists/ отправляет Authorization: Bearer после auth', async () => {
    await getSpecialists(1, 10);
    const auth = lastRequest!.headers['authorization'];
    expect(auth).toMatch(/^Bearer .+/);
  });

  it('GET /specialists/ передаёт корректные query-параметры', async () => {
    await getSpecialists(2, 5);
    const url = new URL(lastRequest!.url);
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('page_size')).toBe('5');
  });

  it('возвращает results, count, next', async () => {
    const data = await getSpecialists(1, 10);
    expect(Array.isArray(data.results)).toBe(true);
    expect(typeof data.count).toBe('number');
    expect(data.next === null || typeof data.next === 'string').toBe(true);
  });

  it('toggleFavorite отправляет POST /favorites/specialists/:id', async () => {
    await toggleFavorite('1');
    expect(lastRequest!.method).toBe('POST');
    expect(lastRequest!.url).toContain('/favorites/specialists/1');
  });

  it('removeFavorite отправляет DELETE /favorites/specialists/:id', async () => {
    await removeFavorite('1');
    expect(lastRequest!.method).toBe('DELETE');
    expect(lastRequest!.url).toContain('/favorites/specialists/1');
  });

  it('возвращает 500 → бросает ошибку', async () => {
    server.use(
      http.get(`${BASE}/specialists/`, () =>
        HttpResponse.json({ error: 'server error' }, { status: 500 }),
      ),
    );
    await expect(getSpecialists(1, 10)).rejects.toMatchObject({
      response: expect.objectContaining({ status: 500 }),
    });
  });
});
