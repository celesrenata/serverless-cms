import { vi, describe, it, expect, beforeEach } from 'vitest';

const { mockGet, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: mockGet,
      post: mockPost,
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
}));

import { api } from '../api';

describe('api service', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it('getContent(id) calls GET /content/{id}', async () => {
    const content = { id: 'content-1', title: 'Test Content' };
    mockGet.mockResolvedValueOnce({ data: content });

    const result = await api.getContent('content-1');

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/content/content-1');
    expect(result).toEqual(content);
  });

  it('getContentBySlug(slug) calls GET /content/slug/{slug}', async () => {
    const content = { id: 'content-1', slug: 'test-content', title: 'Test Content' };
    mockGet.mockResolvedValueOnce({ data: content });

    const result = await api.getContentBySlug('test-content');

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/content/slug/test-content');
    expect(result).toEqual(content);
  });

  it('listContent(filters) calls GET /content with query params', async () => {
    const response = {
      items: [{ id: 'content-1', title: 'Test Content' }],
      last_key: 'next-key',
      count: 1,
    };

    mockGet.mockResolvedValueOnce({ data: response });

    const result = await api.listContent({
      type: 'page',
      status: 'published',
      limit: 10,
      last_key: 'previous-key',
    });

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/content', {
      params: expect.any(URLSearchParams),
    });

    const params = mockGet.mock.calls[0][1].params as URLSearchParams;
    expect(params.get('type')).toBe('page');
    expect(params.get('status')).toBe('published');
    expect(params.get('limit')).toBe('10');
    expect(params.get('last_key')).toBe('previous-key');
    expect(result).toEqual(response);
  });

  it('getSettings() calls GET /settings', async () => {
    const settings = { site_name: 'Public Website', site_description: 'Test site' };
    mockGet.mockResolvedValueOnce({ data: settings });

    const result = await api.getSettings();

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/settings');
    expect(result).toEqual(settings);
  });

  it('getPublicSettings() calls GET /settings/public', async () => {
    const settings = { site_name: 'Public Website', site_description: 'Public settings' };
    mockGet.mockResolvedValueOnce({ data: settings });

    const result = await api.getPublicSettings();

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/settings/public');
    expect(result).toEqual(settings);
  });

  it('getComments(contentId) calls GET /content/{contentId}/comments', async () => {
    const comments = [
      {
        id: 'comment-1',
        author_name: 'Jane Doe',
        comment_text: 'Great post!',
      },
    ];

    mockGet.mockResolvedValueOnce({ data: { comments } });

    const result = await api.getComments('content-1');

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/content/content-1/comments');
    expect(result).toEqual(comments);
  });

  it('createComment(contentId, data) calls POST /content/{contentId}/comments', async () => {
    const data = {
      author_name: 'Jane Doe',
      author_email: 'jane@example.com',
      comment_text: 'Great post!',
    };

    const response = {
      id: 'comment-1',
      ...data,
    };

    mockPost.mockResolvedValueOnce({ data: response });

    const result = await api.createComment('content-1', data);

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/content/content-1/comments', data);
    expect(result).toEqual(response);
  });

  it('register(data) calls POST /auth/register', async () => {
    const data = {
      email: 'user@example.com',
      password: 'password123',
      name: 'Test User',
    };

    const response = {
      user: { id: 'user-1', email: data.email, name: data.name },
      message: 'Registration successful',
    };

    mockPost.mockResolvedValueOnce({ data: response });

    const result = await api.register(data);

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/auth/register', data);
    expect(result).toEqual(response);
  });

  it('verifyEmail(email, code) calls POST /auth/verify-email', async () => {
    const response = { message: 'Email verified' };
    mockPost.mockResolvedValueOnce({ data: response });

    const result = await api.verifyEmail('user@example.com', '123456');

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/auth/verify-email', {
      email: 'user@example.com',
      code: '123456',
    });
    expect(result).toEqual(response);
  });

  it('resendVerification(email) calls POST /auth/resend-verification', async () => {
    const response = { message: 'Verification email sent' };
    mockPost.mockResolvedValueOnce({ data: response });

    const result = await api.resendVerification('user@example.com');

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/auth/resend-verification', {
      email: 'user@example.com',
    });
    expect(result).toEqual(response);
  });

  it('propagates network errors', async () => {
    const networkError = new Error('Network Error');
    mockGet.mockRejectedValueOnce(networkError);

    await expect(api.getContent('content-1')).rejects.toBe(networkError);

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/content/content-1');
  });

  it('createComment extracts error message from API response', async () => {
    const data = {
      author_name: 'Jane Doe',
      author_email: 'jane@example.com',
      comment_text: 'Great post!',
    };

    mockPost.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Spam detected',
        },
      },
    });

    await expect(api.createComment('content-1', data)).rejects.toThrow('Spam detected');

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/content/content-1/comments', data);
  });
});
