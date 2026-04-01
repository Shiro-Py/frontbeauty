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

const BASE = 'https://dev.gobeauty.site/api/v1';

let lastRequest: Request | null = null;

const server = setupServer(
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
