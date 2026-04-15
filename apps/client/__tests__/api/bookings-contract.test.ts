/** @jest-environment node */
/**
 * API Contract Tests — Bookings [MOB][F4]
 * cancelBooking: PATCH /status → POST /cancel/
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
import { cancelBooking } from '../../../../packages/shared/src/api/bookings';

const BASE = 'https://dev.gobeauty.site/api/v1';

let lastRequest: Request | null = null;
let lastBody: any = null;

const server = setupServer(
  http.post(`${BASE}/appointments/:id/cancel/`, async ({ request, params }) => {
    lastRequest = request.clone();
    lastBody = await request.json();
    return HttpResponse.json({ status: 'cancelled' });
  }),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
  initializeApiClient('client');
});
afterEach(() => {
  server.resetHandlers();
  lastRequest = null;
  lastBody = null;
});
afterAll(() => server.close());

describe('cancelBooking — POST /appointments/{id}/cancel/ [MOB][F4]', () => {
  it('отправляет POST (не PATCH) на /appointments/{id}/cancel/', async () => {
    await cancelBooking('booking-42');
    expect(lastRequest!.method).toBe('POST');
    expect(lastRequest!.url).toContain('/appointments/booking-42/cancel/');
  });

  it('без reason отправляет пустое тело', async () => {
    await cancelBooking('booking-42');
    expect(lastBody).toEqual({});
  });

  it('с reason передаёт cancellation_reason в теле', async () => {
    await cancelBooking('booking-42', 'Изменились планы');
    expect(lastBody.cancellation_reason).toBe('Изменились планы');
  });

  it('отправляет Authorization: Bearer', async () => {
    await cancelBooking('booking-42');
    expect(lastRequest!.headers.get('Authorization')).toMatch(/^Bearer .+/);
  });

  it('бросает ошибку при 422 CANCELLATION_NOT_ALLOWED', async () => {
    server.use(
      http.post(`${BASE}/appointments/:id/cancel/`, () =>
        HttpResponse.json(
          { error: { code: 'CANCELLATION_NOT_ALLOWED' } },
          { status: 422 },
        ),
      ),
    );
    await expect(cancelBooking('booking-42')).rejects.toMatchObject({
      response: expect.objectContaining({ status: 422 }),
    });
  });

  it('бросает ошибку при 422 INVALID_STATUS', async () => {
    server.use(
      http.post(`${BASE}/appointments/:id/cancel/`, () =>
        HttpResponse.json(
          { error: { code: 'INVALID_STATUS' } },
          { status: 422 },
        ),
      ),
    );
    await expect(cancelBooking('booking-42')).rejects.toMatchObject({
      response: expect.objectContaining({ status: 422 }),
    });
  });
});
