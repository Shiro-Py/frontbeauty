import { http, HttpResponse } from 'msw';

const BASE = 'https://dev.gobeauty.site/api/v1';

export const handlers = [
  // ── Auth ────────────────────────────────────────────────────────────────────
  http.post(`${BASE}/auth/request-otp`, () =>
    HttpResponse.json({ expires_in: 300, retry_after: 60, is_new_user: false }),
  ),

  http.post(`${BASE}/auth/verify-otp/`, async ({ request }) => {
    const appType = request.headers.get('X-App-Type');
    if (appType !== 'client') {
      return HttpResponse.json({ error: { code: 'WRONG_APP_TYPE' } }, { status: 403 });
    }
    const body = (await request.json()) as { phone: string; code: string; device_id: string };
    if (body.code === '123456') {
      return HttpResponse.json({
        access: 'test-access', refresh: 'test-refresh', is_new_user: false,
      });
    }
    return HttpResponse.json({ error: { code: 'INVALID_OTP' } }, { status: 400 });
  }),

  http.post(`${BASE}/auth/token/refresh/`, () =>
    HttpResponse.json({ access: 'refreshed-access', refresh: 'refreshed-refresh' }),
  ),

  http.get(`${BASE}/auth/clients/me/`, () =>
    HttpResponse.json({
      id: 'user-1',
      phone: '+79001234567',
      first_name: 'Тест',
      last_name: 'Юзер',
      role: 'client',
    }),
  ),

  http.patch(`${BASE}/auth/clients/me/`, () => HttpResponse.json({ ok: true })),

  // ── Specialists ──────────────────────────────────────────────────────────────
  http.get(`${BASE}/specialists/`, ({ request }) => {
    const appType = request.headers.get('X-App-Type');
    const auth = request.headers.get('Authorization');
    if (!appType) {
      return HttpResponse.json({ error: 'missing X-App-Type' }, { status: 400 });
    }
    return HttpResponse.json({
      results: [
        {
          id: '1',
          first_name: 'Мария',
          last_name: 'Иванова',
          rating: 4.8,
          reviews_count: 10,
          top_service: { name: 'Маникюр', price: 1800, duration_minutes: 60 },
        },
        {
          id: '2',
          first_name: 'Ольга',
          last_name: 'Смирнова',
          rating: 4.2,
          reviews_count: 5,
          top_service: { name: 'Массаж', price: 2500, duration_minutes: 90 },
        },
      ],
      count: 2,
      next: null,
    });
  }),

  http.post(`${BASE}/favorites/specialists/:id`, () => HttpResponse.json({ added: true }, { status: 201 })),
  http.delete(`${BASE}/favorites/specialists/:id`, () => new HttpResponse(null, { status: 204 })),

  // ── Reviews ──────────────────────────────────────────────────────────────────
  http.get(`${BASE}/specialists/:id/reviews/`, () =>
    HttpResponse.json({ results: [], count: 0, next: null }),
  ),

  http.post(`${BASE}/reviews/`, () =>
    HttpResponse.json({ id: 'review-1' }, { status: 201 }),
  ),
];
