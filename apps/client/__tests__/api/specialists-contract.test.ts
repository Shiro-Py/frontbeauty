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

let lastRequest: Request | null = null;

const mockResults = [
  { id: '1', first_name: 'Мария', last_name: 'Иванова', rating: 4.8, reviews_count: 10 },
  { id: '2', first_name: 'Ольга', last_name: 'Смирнова', rating: 4.2, reviews_count: 5 },
];

const server = setupServer(
  http.get(`${BASE}/specialists/`, ({ request }) => {
    lastRequest = request;
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const pageSize = parseInt(url.searchParams.get('page_size') ?? '10');
    return HttpResponse.json({
      results: mockResults,
      count: 2,
      next: null,
    });
  }),

  http.post(`${BASE}/specialists/:id/favorite/`, ({ request, params }) => {
    lastRequest = request;
    return HttpResponse.json({ ok: true });
  }),

  http.delete(`${BASE}/specialists/:id/favorite/`, ({ request }) => {
    lastRequest = request;
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
    expect(lastRequest!.headers.get('X-App-Type')).toBe('client');
  });

  it('GET /specialists/ отправляет Authorization: Bearer после auth', async () => {
    await getSpecialists(1, 10);
    const auth = lastRequest!.headers.get('Authorization');
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

  it('toggleFavorite отправляет POST /specialists/:id/favorite/', async () => {
    await toggleFavorite('1');
    expect(lastRequest!.method).toBe('POST');
    expect(lastRequest!.url).toContain('/specialists/1/favorite/');
  });

  it('removeFavorite отправляет DELETE /specialists/:id/favorite/', async () => {
    await removeFavorite('1');
    expect(lastRequest!.method).toBe('DELETE');
    expect(lastRequest!.url).toContain('/specialists/1/favorite/');
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
