/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Hoisted mock state and helpers — set up BEFORE module evaluation so that
 * when `../api` is imported, `axios.create` returns our controlled instance.
 */
const mocked = vi.hoisted(() => {
  const state: {
    requestFulfilled?: (config: any) => any;
    requestRejected?: (error: any) => any;
    responseFulfilled?: (response: any) => any;
    responseRejected?: (error: any) => any;
  } = {};

  const instance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn((fulfilled: any, rejected: any) => {
          state.requestFulfilled = fulfilled;
          state.requestRejected = rejected;
          return 0;
        }),
      },
      response: {
        use: vi.fn((fulfilled: any, rejected: any) => {
          state.responseFulfilled = fulfilled;
          state.responseRejected = rejected;
          return 0;
        }),
      },
    },
  };

  return {
    state,
    instance,
    axiosCreate: vi.fn(() => instance),
    AuthService: {
      getIdToken: vi.fn(),
      refreshToken: vi.fn(),
      logout: vi.fn(),
    },
  };
});

vi.mock('axios', () => ({
  default: { create: mocked.axiosCreate },
  create: mocked.axiosCreate,
}));

vi.mock('../auth', () => ({
  AuthService: mocked.AuthService,
}));

// Dynamically import the module under test so that mocks are established first
const importApi = async () => import('../api');

describe('API Service', () => {
  beforeEach(() => {
    vi.resetModules();

    // Reset captured interceptor references
    mocked.state.requestFulfilled = undefined;
    mocked.state.requestRejected = undefined;
    mocked.state.responseFulfilled = undefined;
    mocked.state.responseRejected = undefined;

    mocked.axiosCreate.mockClear();
    mocked.instance.get.mockReset();
    mocked.instance.post.mockReset();
    mocked.instance.put.mockReset();
    mocked.instance.delete.mockReset();
    mocked.instance.request.mockReset();
    mocked.instance.interceptors.request.use.mockClear();
    mocked.instance.interceptors.response.use.mockClear();

    mocked.AuthService.getIdToken.mockReset();
    mocked.AuthService.refreshToken.mockReset();
    mocked.AuthService.logout.mockReset();

    mocked.AuthService.getIdToken.mockReturnValue(null);
    mocked.AuthService.refreshToken.mockResolvedValue(null);

    // Reset location
    Object.defineProperty(window, 'location', {
      value: { pathname: '/dashboard', href: '/dashboard' },
      writable: true,
    });
  });

  describe('initialization', () => {
    it('creates an axios instance with correct config and registers interceptors', async () => {
      await importApi();

      expect(mocked.axiosCreate).toHaveBeenCalledTimes(1);
      expect(mocked.axiosCreate).toHaveBeenCalledWith({
        baseURL: expect.any(String),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(mocked.instance.interceptors.request.use).toHaveBeenCalledTimes(1);
      expect(mocked.instance.interceptors.response.use).toHaveBeenCalledTimes(1);
    });
  });

  describe('content methods', () => {
    it('listContent() calls GET /content with params', async () => {
      const { api } = await importApi();
      const filters = { status: 'published', type: 'post' };
      const responseData = { items: [{ id: '1', title: 'Post' }], total: 1 };
      mocked.instance.get.mockResolvedValueOnce({ data: responseData });

      const result = await api.listContent(filters);

      expect(mocked.instance.get).toHaveBeenCalledWith('/content', { params: filters });
      expect(result).toEqual(responseData);
    });

    it('createContent(data) calls POST /content with body', async () => {
      const { api } = await importApi();
      const payload = { title: 'New Post', content: '<p>Hello</p>', type: 'post', slug: 'new-post', status: 'draft' };
      const responseData = { id: 'content-1', ...payload };
      mocked.instance.post.mockResolvedValueOnce({ data: responseData });

      const result = await api.createContent(payload as any);

      expect(mocked.instance.post).toHaveBeenCalledWith('/content', payload);
      expect(result).toEqual(responseData);
    });

    it('updateContent(id, data) calls PUT /content/:id with body', async () => {
      const { api } = await importApi();
      const id = 'content-123';
      const payload = { title: 'Updated Title' };
      const responseData = { id, ...payload };
      mocked.instance.put.mockResolvedValueOnce({ data: responseData });

      const result = await api.updateContent(id, payload as any);

      expect(mocked.instance.put).toHaveBeenCalledWith(`/content/${id}`, payload);
      expect(result).toEqual(responseData);
    });

    it('deleteContent(id) calls DELETE /content/:id', async () => {
      const { api } = await importApi();
      const id = 'content-123';
      mocked.instance.delete.mockResolvedValueOnce({ data: undefined });

      await api.deleteContent(id);

      expect(mocked.instance.delete).toHaveBeenCalledWith(`/content/${id}`);
    });
  });

  describe('media upload', () => {
    it('uploadMedia(file) sends multipart/form-data POST to /media/upload', async () => {
      const { api } = await importApi();
      const file = new File(['data'], 'photo.png', { type: 'image/png' });
      const responseData = { id: 'media-1', filename: 'photo.png', s3_url: 'https://s3/photo.png' };
      mocked.instance.post.mockResolvedValueOnce({ data: responseData });

      const result = await api.uploadMedia(file);

      expect(mocked.instance.post).toHaveBeenCalledTimes(1);
      const [url, formData, config] = mocked.instance.post.mock.calls[0] as [string, FormData, any];
      expect(url).toBe('/media/upload');
      expect(formData).toBeInstanceOf(FormData);
      expect(formData.get('file')).toBe(file);
      expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
      expect(result).toEqual(responseData);
    });

    it('uploadMedia(file, metadata) includes serialized metadata in FormData', async () => {
      const { api } = await importApi();
      const file = new File(['data'], 'photo.png', { type: 'image/png' });
      const metadata = { alt_text: 'A photo' };
      mocked.instance.post.mockResolvedValueOnce({ data: { id: 'media-1' } });

      await api.uploadMedia(file, metadata);

      const [, formData] = mocked.instance.post.mock.calls[0] as [string, FormData];
      expect(formData.get('metadata')).toBe(JSON.stringify(metadata));
    });
  });

  describe('error propagation', () => {
    it('throws ApiError with status 400 for bad request responses', async () => {
      const { ApiError } = await importApi();
      const responseRejected = mocked.state.responseRejected!;

      const error = {
        response: { status: 400, data: { error: 'Invalid request body' } },
        config: { url: '/content', method: 'post', headers: {} },
      };

      try {
        await responseRejected(error);
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e).toBeInstanceOf(ApiError);
        expect(e.statusCode).toBe(400);
        expect(e.message).toBe('Invalid request body');
        expect(e.data).toEqual({ error: 'Invalid request body' });
      }
    });

    it('throws ApiError with status 500 and fallback message', async () => {
      const { ApiError } = await importApi();
      const responseRejected = mocked.state.responseRejected!;

      const error = {
        response: { status: 500, data: { details: 'Internal failure' } },
        config: { url: '/content', method: 'get', headers: {} },
      };

      try {
        await responseRejected(error);
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e).toBeInstanceOf(ApiError);
        expect(e.statusCode).toBe(500);
        expect(e.message).toBe('An error occurred');
      }
    });

    it('throws ApiError with status 0 for network errors (no response)', async () => {
      const { ApiError } = await importApi();
      const responseRejected = mocked.state.responseRejected!;

      const error = { message: 'Network Error', config: {} };

      try {
        await responseRejected(error);
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e).toBeInstanceOf(ApiError);
        expect(e.statusCode).toBe(0);
        expect(e.message).toBe('Network error');
      }
    });
  });

  describe('401 handling', () => {
    it('attempts token refresh on 401 and retries the request when refresh succeeds', async () => {
      await importApi();
      const responseRejected = mocked.state.responseRejected!;

      const refreshedTokens = { idToken: 'new-token', accessToken: 'new-access', refreshToken: 'new-refresh' };
      const retryResponse = { data: { items: [] }, status: 200 };
      mocked.AuthService.refreshToken.mockResolvedValueOnce(refreshedTokens);
      mocked.instance.request.mockResolvedValueOnce(retryResponse);

      const originalConfig = { url: '/content', method: 'get', headers: {} };
      const result = await responseRejected({
        response: { status: 401, data: { error: 'Token expired' } },
        config: originalConfig,
      });

      expect(mocked.AuthService.refreshToken).toHaveBeenCalledTimes(1);
      expect(mocked.instance.request).toHaveBeenCalledWith({ ...originalConfig, _retry: true });
      expect(result).toBe(retryResponse);
      expect(mocked.AuthService.logout).not.toHaveBeenCalled();
    });

    it('calls logout and throws ApiError when refresh returns null', async () => {
      const { ApiError } = await importApi();
      const responseRejected = mocked.state.responseRejected!;

      mocked.AuthService.refreshToken.mockResolvedValueOnce(null);

      try {
        await responseRejected({
          response: { status: 401, data: {} },
          config: { url: '/content', method: 'get', headers: {} },
        });
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e).toBeInstanceOf(ApiError);
        expect(e.statusCode).toBe(401);
        expect(e.message).toBe('Session expired');
      }

      expect(mocked.AuthService.refreshToken).toHaveBeenCalledTimes(1);
      expect(mocked.AuthService.logout).toHaveBeenCalled();
    });

    it('calls logout and throws ApiError when refresh throws an error', async () => {
      const { ApiError } = await importApi();
      const responseRejected = mocked.state.responseRejected!;

      mocked.AuthService.refreshToken.mockRejectedValueOnce(new Error('Refresh failed'));

      try {
        await responseRejected({
          response: { status: 401, data: {} },
          config: { url: '/content', method: 'get', headers: {} },
        });
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e).toBeInstanceOf(ApiError);
        expect(e.statusCode).toBe(401);
        expect(e.message).toBe('Session expired');
      }

      expect(mocked.AuthService.logout).toHaveBeenCalledTimes(1);
    });

    it('throws Authentication required without refresh attempt when _retry is already set', async () => {
      const { ApiError } = await importApi();
      const responseRejected = mocked.state.responseRejected!;

      try {
        await responseRejected({
          response: { status: 401, data: {} },
          config: { url: '/content', method: 'get', headers: {}, _retry: true },
        });
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e).toBeInstanceOf(ApiError);
        expect(e.statusCode).toBe(401);
        expect(e.message).toBe('Authentication required');
      }

      expect(mocked.AuthService.refreshToken).not.toHaveBeenCalled();
      expect(mocked.AuthService.logout).not.toHaveBeenCalled();
    });
  });

  describe('request interceptor', () => {
    it('adds Bearer token header when AuthService.getIdToken returns a token', async () => {
      await importApi();
      const requestFulfilled = mocked.state.requestFulfilled!;

      mocked.AuthService.getIdToken.mockReturnValueOnce('my-id-token');
      const config = { headers: {} as Record<string, string> };

      const result = requestFulfilled(config);

      expect(result.headers.Authorization).toBe('Bearer my-id-token');
    });

    it('does not add Authorization header when no token exists', async () => {
      await importApi();
      const requestFulfilled = mocked.state.requestFulfilled!;

      mocked.AuthService.getIdToken.mockReturnValueOnce(null);
      const config = { headers: {} as Record<string, string> };

      const result = requestFulfilled(config);

      expect(result.headers.Authorization).toBeUndefined();
    });
  });
});
