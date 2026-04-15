/** @jest-environment node */
/**
 * API Contract Tests — Reviews
 */

jest.mock('../../../../packages/shared/src/api/mock', () => ({
  IS_MOCK: false,
  MOCK_CODE: '123456',
  mockVerifyResponse: () => ({}),
  mockProfile: {},
}));

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
import { submitReview } from '../../../../packages/shared/src/api/reviews';
import { getMasterReviews } from '../../../../packages/shared/src/api/masters';

const BASE = 'https://dev.gobeauty.site/api/v1';

let lastRequest: Request | null = null;

const server = setupServer(
  http.get(`${BASE}/specialists/:id/reviews/`, ({ request, params }) => {
    lastRequest = request;
    return HttpResponse.json({
      results: [
        { id: 'r1', author_name: 'Анна', rating: 5, text: 'Отлично!', created_at: '2026-01-01T00:00:00Z' },
      ],
      count: 1,
      next: null,
      previous: null,
    });
  }),

  http.post(`${BASE}/reviews/`, async ({ request }) => {
    lastRequest = request.clone();
    const body = (await request.json()) as any;
    if (!body.specialist_id || !body.rating) {
      return HttpResponse.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 });
    }
    return HttpResponse.json({ id: 'review-1', rating: body.rating }, { status: 201 });
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

describe('Reviews API Contract', () => {
  const validPayload = {
    specialist_id: 'specialist-1',
    rating: 5,
    text: 'Отличный мастер!',
    is_anonymous: false,
  };

  it('POST /reviews/ отправляет X-App-Type: client', async () => {
    await submitReview(validPayload);
    expect(lastRequest!.headers.get('X-App-Type')).toBe('client');
  });

  it('POST /reviews/ отправляет Authorization: Bearer', async () => {
    await submitReview(validPayload);
    expect(lastRequest!.headers.get('Authorization')).toMatch(/^Bearer .+/);
  });

  it('тело запроса содержит specialist_id, rating, text, is_anonymous', async () => {
    let body: any;
    server.use(
      http.post(`${BASE}/reviews/`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'r1' }, { status: 201 });
      }),
    );
    await submitReview(validPayload);
    expect(body.specialist_id).toBe('specialist-1');
    expect(body.rating).toBe(5);
    expect(body.text).toBe('Отличный мастер!');
    expect(body.is_anonymous).toBe(false);
  });

  it('отправляет is_anonymous: true если анонимный', async () => {
    let body: any;
    server.use(
      http.post(`${BASE}/reviews/`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'r1' }, { status: 201 });
      }),
    );
    await submitReview({ ...validPayload, is_anonymous: true });
    expect(body.is_anonymous).toBe(true);
  });

  it('не включает appointment_id если не передан', async () => {
    let body: any;
    server.use(
      http.post(`${BASE}/reviews/`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'r1' }, { status: 201 });
      }),
    );
    await submitReview(validPayload);
    expect(body.appointment_id).toBeUndefined();
  });

  it('включает appointment_id если передан', async () => {
    let body: any;
    server.use(
      http.post(`${BASE}/reviews/`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'r1' }, { status: 201 });
      }),
    );
    await submitReview({ ...validPayload, appointment_id: 'appt-42' });
    expect(body.appointment_id).toBe('appt-42');
  });

  it('бросает ошибку при 400 (невалидный запрос)', async () => {
    server.use(
      http.post(`${BASE}/reviews/`, () =>
        HttpResponse.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 }),
      ),
    );
    await expect(submitReview(validPayload)).rejects.toMatchObject({
      response: expect.objectContaining({ status: 400 }),
    });
  });

  it('бросает ошибку при 500', async () => {
    server.use(
      http.post(`${BASE}/reviews/`, () =>
        HttpResponse.json({ error: 'server error' }, { status: 500 }),
      ),
    );
    await expect(submitReview(validPayload)).rejects.toMatchObject({
      response: expect.objectContaining({ status: 500 }),
    });
  });
});

describe('getMasterReviews — GET /specialists/{id}/reviews/ [MOB][F3]', () => {
  it('запрашивает правильный URL с id специалиста', async () => {
    await getMasterReviews('spec-42');
    expect(lastRequest!.url).toContain('/specialists/spec-42/reviews/');
  });

  it('возвращает { results, count, next, previous }', async () => {
    const res = await getMasterReviews('spec-42');
    expect(Array.isArray(res.results)).toBe(true);
    expect(typeof res.count).toBe('number');
    expect('next' in res).toBe(true);
    expect('previous' in res).toBe(true);
  });

  it('результаты содержат поля MasterReview', async () => {
    const res = await getMasterReviews('spec-42');
    const review = res.results[0];
    expect(review).toMatchObject({
      id: expect.any(String),
      author_name: expect.any(String),
      rating: expect.any(Number),
      text: expect.any(String),
      created_at: expect.any(String),
    });
  });

  it('передаёт параметр page в URL', async () => {
    let capturedUrl = '';
    server.use(
      http.get(`${BASE}/specialists/:id/reviews/`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ results: [], count: 0, next: null, previous: null });
      }),
    );
    await getMasterReviews('spec-42', 3);
    expect(capturedUrl).toContain('page=3');
  });

  it('бросает ошибку при 404 (специалист не найден)', async () => {
    server.use(
      http.get(`${BASE}/specialists/:id/reviews/`, () =>
        HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 }),
      ),
    );
    await expect(getMasterReviews('nonexistent')).rejects.toMatchObject({
      response: expect.objectContaining({ status: 404 }),
    });
  });
});
