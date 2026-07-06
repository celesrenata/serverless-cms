import { Content, SiteSettings, PaginatedResponse } from '../../types';

/**
 * Comment interface for test mocks.
 * The public website API returns comments but doesn't export a typed interface.
 */
export interface Comment {
  id: string;
  content_id: string;
  author_name: string;
  author_email?: string;
  comment_text: string;
  parent_id?: string;
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  created_at: number;
  updated_at: number;
}

/**
 * Creates a mock Content object with realistic defaults.
 * Accepts partial overrides to customize specific fields per test.
 */
export function createMockContent(overrides?: Partial<Content>): Content {
  return {
    id: 'content-001',
    type: 'post',
    title: 'Test Post',
    slug: 'test-post',
    content: '<p>This is test content for the post.</p>',
    excerpt: 'Test excerpt for the post',
    author: 'user-001',
    author_name: 'Test Author',
    status: 'published',
    featured_image: 'https://example.com/images/featured.jpg',
    metadata: {
      tags: ['test', 'mock'],
      categories: ['general'],
    },
    created_at: 1700000000,
    updated_at: 1700000000,
    published_at: 1700000000,
    ...overrides,
  };
}

/**
 * Creates a mock Comment object with realistic defaults.
 * Accepts partial overrides to customize specific fields per test.
 */
export function createMockComment(overrides?: Partial<Comment>): Comment {
  return {
    id: 'comment-001',
    content_id: 'content-001',
    author_name: 'Test Commenter',
    author_email: 'commenter@example.com',
    comment_text: 'Great post! Thanks for sharing.',
    status: 'approved',
    created_at: 1700000000,
    updated_at: 1700000000,
    ...overrides,
  };
}

/**
 * Creates a mock SiteSettings object with realistic defaults.
 * Accepts partial overrides to customize specific fields per test.
 */
export function createMockSettings(overrides?: Partial<SiteSettings>): SiteSettings {
  return {
    site_title: 'Test Site',
    site_description: 'A test website for unit testing',
    theme: 'default',
    registration_enabled: true,
    comments_enabled: true,
    captcha_enabled: false,
    ...overrides,
  };
}

/**
 * Creates a mock paginated content list response.
 * @param count Number of content items to generate (default: 3)
 */
export function createMockContentList(count: number = 3): PaginatedResponse<Content> {
  const items = Array.from({ length: count }, (_, i) =>
    createMockContent({
      id: `content-${String(i + 1).padStart(3, '0')}`,
      title: `Test Post ${i + 1}`,
      slug: `test-post-${i + 1}`,
      created_at: 1700000000 - i * 86400,
      updated_at: 1700000000 - i * 86400,
      published_at: 1700000000 - i * 86400,
    })
  );

  return {
    items,
    last_key: count > 10 ? { id: items[items.length - 1].id } : undefined,
  };
}
