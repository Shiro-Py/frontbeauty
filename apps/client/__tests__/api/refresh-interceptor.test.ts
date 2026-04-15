/** @jest-environment node */
/**
 * Тест refresh interceptor — [MOB][F2]
 * При 401 клиент должен автоматически обновить токен и повторить запрос.
 * Проверяем три формата ответа /auth/token/refresh/:
 *   1. BeautyGO custom:  { access_token, refresh_token }
 *   2. DRF envelope:     { data: { access_token, refresh_token } }
 *   3. SimpleJWT default: { access, refresh }
 */

jest.mock('../../../../packages/shared/src/api/mock', () => ({
  IS_MOCK: false,
  MOCK_CODE: '123456',
  mockVerifyResponse: () => ({ access_token: 'a', refresh_token: 'r', is_new_user: false }),
  mockProfile: { id: 'u1', phone: '+79001234567', first_name: 'Test', last_name: 'User', role: 'client' },
}));

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { initializeApiClient, getApiClient, setUnauthorizedHandler } from '../../../../packages/shared/src/api/client';
import { tokenStorage } from '../../../../packages/shared/src/storage/tokenStorage';

const BASE = 'https://dev.gobeauty.site/api/v1';

// Мокаем tokenStorage
jest.mock('../../../../packages/shared/src/storage/tokenStorage', () => ({
  tokenStorage: {
    getAccess: jest.fn(),
    getRefresh: jest.fn(),
    getAnonymous: jest.fn().mockResolvedValue(null),
    getDeviceId: jest.fn().mockResolvedValue('device-id'),
    save: jest.fn(),
    clear: jest.fn(),
  },
}));

const mockStorage = tokenStorage as jest.Mocked<typeof tokenStorage>;

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
  initializeApiClient('client');
});
afterEach(() => {
  server.resetHandlers();
  jest.clearAllMocks();
});
afterAll(() => server.close());

function setupProtectedEndpoint(hitCount = { n: 0 }) {
  server.use(
    http.get(`${BASE}/users/me/`, () => {
      hitCount.n++;
      if (hitCount.n === 1) {
        return HttpResponse.json({ error: { code: 'TOKEN_EXPIRED' } }, { status: 401 });
      }
      return HttpResponse.json({ id: 'u1', phone: '+79001234567' });
    }),
  );
  return hitCount;
}

describe('Refresh interceptor [MOB][F2]', () => {
  it('формат 1: { access_token, refresh_token } — сохраняет новый токен и повторяет запрос', async () => {
    mockStorage.getAccess.mockResolvedValue('old-access');
    mockStorage.getRefresh.mockResolvedValue('old-refresh');

    server.use(
      http.post(`${BASE}/auth/token/refresh/`, () =>
        HttpResponse.json({ access_token: 'new-access', refresh_token: 'new-refresh' }),
      ),
    );
    const hitCount = setupProtectedEndpoint();

    const api = getApiClient();
    const res = await api.get('/users/me/');

    expect(hitCount.n).toBe(2); // первый запрос упал, второй прошёл
    expect(mockStorage.save).toHaveBeenCalledWith('new-access', 'new-refresh');
    expect(res.data).toMatchObject({ id: 'u1' });
  });

  it('формат 2: DRF envelope { data: { access_token, refresh_token } } — корректно разворачивает', async () => {
    mockStorage.getAccess.mockResolvedValue('old-access');
    mockStorage.getRefresh.mockResolvedValue('old-refresh');

    server.use(
      http.post(`${BASE}/auth/token/refresh/`, () =>
        HttpResponse.json({ data: { access_token: 'env-access', refresh_token: 'env-refresh' } }),
      ),
    );
    const hitCount = setupProtectedEndpoint();

    const api = getApiClient();
    await api.get('/users/me/');

    expect(hitCount.n).toBe(2);
    expect(mockStorage.save).toHaveBeenCalledWith('env-access', 'env-refresh');
  });

  it('формат 3: SimpleJWT { access, refresh } — совместимость со стандартным ответом', async () => {
    mockStorage.getAccess.mockResolvedValue('old-access');
    mockStorage.getRefresh.mockResolvedValue('old-refresh');

    server.use(
      http.post(`${BASE}/auth/token/refresh/`, () =>
        HttpResponse.json({ access: 'jwt-access', refresh: 'jwt-refresh' }),
      ),
    );
    const hitCount = setupProtectedEndpoint();

    const api = getApiClient();
    await api.get('/users/me/');

    expect(hitCount.n).toBe(2);
    expect(mockStorage.save).toHaveBeenCalledWith('jwt-access', 'jwt-refresh');
  });

  it('если нет refresh token — вызывает onUnauthorized без запроса к /auth/token/refresh/', async () => {
    mockStorage.getAccess.mockResolvedValue(null);
    mockStorage.getRefresh.mockResolvedValue(null);

    const onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);

    server.use(
      http.get(`${BASE}/users/me/`, () =>
        HttpResponse.json({ error: { code: 'TOKEN_EXPIRED' } }, { status: 401 }),
      ),
    );

    const api = getApiClient();
    await expect(api.get('/users/me/')).rejects.toThrow();
    expect(onUnauthorized).toHaveBeenCalled();
    expect(mockStorage.save).not.toHaveBeenCalled();

    setUnauthorizedHandler(() => {});
  });

  it('если refresh endpoint вернул 401 — вызывает onUnauthorized и очищает хранилище', async () => {
    mockStorage.getAccess.mockResolvedValue('old-access');
    mockStorage.getRefresh.mockResolvedValue('bad-refresh');

    const onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);

    server.use(
      http.get(`${BASE}/users/me/`, () =>
        HttpResponse.json({ error: { code: 'TOKEN_EXPIRED' } }, { status: 401 }),
      ),
      http.post(`${BASE}/auth/token/refresh/`, () =>
        HttpResponse.json({ error: { code: 'TOKEN_BLACKLISTED' } }, { status: 401 }),
      ),
    );

    const api = getApiClient();
    await expect(api.get('/users/me/')).rejects.toBeDefined();
    expect(mockStorage.clear).toHaveBeenCalled();
    expect(onUnauthorized).toHaveBeenCalled();

    setUnauthorizedHandler(() => {});
  });
});
