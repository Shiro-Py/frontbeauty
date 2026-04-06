/**
 * API Contract Tests — Auth
 * Проверяют что запросы к API соответствуют контракту:
 * правильные заголовки, тела, обработка ошибок.
 */

// Отключаем mock-режим чтобы API делал реальные HTTP-запросы (перехватываемые MSW)
jest.mock('../../../../packages/shared/src/api/mock', () => ({
  IS_MOCK: false,
  MOCK_CODE: '123456',
  mockVerifyResponse: () => ({ access: 'a', refresh: 'r', is_new_user: false }),
  mockProfile: { id: 'u1', phone: '+79001234567', first_name: 'Test', last_name: 'User', role: 'client' },
}));

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { initializeApiClient } from '../../../../packages/shared/src/api/client';
import { sendOtp, verifyOtp } from '../../../../packages/shared/src/api/auth';

const BASE = 'https://dev.gobeauty.site/api/v1';

let lastRequest: Request | null = null;

const server = setupServer(
  http.post(`${BASE}/auth/request-otp`, ({ request }) => {
    lastRequest = request;
    return HttpResponse.json({ expires_in: 300, retry_after: 60, is_new_user: false });
  }),

  http.post(`${BASE}/auth/verify-otp/`, async ({ request }) => {
    lastRequest = request.clone();
    const body = (await request.json()) as { code: string };
    if (body.code === '123456') {
      return HttpResponse.json({
        access: 'test-access', refresh: 'test-refresh', is_new_user: false,
      });
    }
    return HttpResponse.json({ error: { code: 'INVALID_OTP' } }, { status: 400 });
  }),

  http.get(`${BASE}/auth/clients/me/`, ({ request }) => {
    lastRequest = request;
    return HttpResponse.json({ id: 'u1', phone: '+79001234567', role: 'client' });
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

describe('Auth API Contract', () => {
  it('отправляет X-App-Type: client в каждом запросе', async () => {
    await sendOtp('+79001234567');
    expect(lastRequest!.headers.get('X-App-Type')).toBe('client');
  });

  it('sendOtp отправляет phone в теле и возвращает expires_in', async () => {
    let body: any;
    server.use(
      http.post(`${BASE}/auth/request-otp`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ expires_in: 300, retry_after: 60, is_new_user: false });
      }),
    );
    const res = await sendOtp('+79001234567');
    expect(body.phone).toBe('+79001234567');
    expect(res.expires_in).toBe(300);
    expect(typeof res.is_new_user).toBe('boolean');
  });

  it('verifyOtp отправляет phone, code, device_id в теле', async () => {
    let body: any;
    server.use(
      http.post(`${BASE}/auth/verify-otp/`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ access: 'a', refresh: 'r', is_new_user: false });
      }),
    );
    await verifyOtp('+79001234567', '123456', 'device-123');
    expect(body.phone).toBe('+79001234567');
    expect(body.code).toBe('123456');
    expect(body.device_id).toBe('device-123');
  });

  it('verifyOtp возвращает access и refresh при коде 123456', async () => {
    const res = await verifyOtp('+79001234567', '123456', 'device-id');
    expect(res.access).toBe('test-access');
    expect(res.refresh).toBe('test-refresh');
    expect(typeof res.is_new_user).toBe('boolean');
  });

  it('verifyOtp бросает ошибку INVALID_OTP при неверном коде', async () => {
    await expect(verifyOtp('+79001234567', '000000', 'device-id')).rejects.toMatchObject({
      response: expect.objectContaining({ status: 400 }),
    });
  });

  it('X-Device-Id отправляется в каждом запросе', async () => {
    await sendOtp('+79001234567');
    expect(lastRequest!.headers.get('X-Device-Id')).toBeTruthy();
  });

  it('Content-Type: application/json отправляется по умолчанию', async () => {
    await sendOtp('+79001234567');
    expect(lastRequest!.headers.get('Content-Type')).toContain('application/json');
  });
});
