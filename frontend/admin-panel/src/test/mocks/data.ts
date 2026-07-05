import type {
  Content,
  ContentListResponse,
  Media,
  MediaListResponse,
  User,
  Plugin,
  SiteSettings,
} from '../../types';

export interface Comment {
  id: string;
  content_id: string;
  author_name: string;
  comment_text: string;
  status: string;
  created_at: number;
  parent_id?: string;
}

export function createMockContent(overrides?: Partial<Content>): Content {
  const defaults: Content = {
    id: 'content-001',
    type: 'post',
    title: 'Getting Started with Our CMS',
    slug: 'getting-started-with-our-cms',
    content: '<p>This is a sample post created for testing the CMS admin panel.</p>',
    excerpt: 'A sample introduction post for the CMS admin panel.',
    author: 'user-001',
    author_name: 'Jane Editor',
    status: 'published',
    featured_image: 'https://example.com/image.jpg',
    metadata: {
      seo_title: 'Getting Started with Our CMS',
      seo_description: 'Learn how to get started using our CMS.',
      tags: ['cms', 'getting-started', 'admin'],
      categories: ['Documentation'],
      custom_fields: {
        featured: true,
        reading_time: 4,
      },
    },
    created_at: 1700000000,
    updated_at: 1700003600,
    published_at: 1700007200,
  };

  return { ...defaults, ...overrides };
}

export function createMockMedia(overrides?: Partial<Media>): Media {
  const defaults: Media = {
    id: 'media-001',
    filename: 'hero-image.jpg',
    s3_key: 'uploads/2023/hero-image.jpg',
    s3_url: 'https://example.com/image.jpg',
    mime_type: 'image/jpeg',
    size: 245760,
    dimensions: {
      width: 1920,
      height: 1080,
    },
    thumbnails: {
      small: 'https://example.com/image-small.jpg',
      medium: 'https://example.com/image-medium.jpg',
      large: 'https://example.com/image-large.jpg',
    },
    metadata: {
      alt_text: 'CMS dashboard hero image',
      caption: 'A sample hero image used in tests.',
      exif: {
        camera: 'Test Camera',
        iso: 100,
      },
    },
    uploaded_by: 'user-001',
    uploaded_at: 1700000000,
  };

  return { ...defaults, ...overrides };
}

export function createMockUser(overrides?: Partial<User>): User {
  const defaults: User = {
    id: 'user-001',
    email: 'jane.editor@example.com',
    username: 'jane.editor',
    name: 'Jane Editor',
    display_name: 'Jane Editor',
    role: 'editor',
    avatar_url: 'https://example.com/avatar.jpg',
    bio: 'Content editor responsible for publishing articles and pages.',
    created_at: 1700000000,
    last_login: 1700007200,
  };

  return { ...defaults, ...overrides };
}

export function createMockPlugin(overrides?: Partial<Plugin>): Plugin {
  const defaults: Plugin = {
    id: 'plugin-001',
    name: 'SEO Assistant',
    version: '1.2.0',
    description: 'Adds SEO metadata tools and content optimization checks.',
    author: 'Example Plugins Inc.',
    active: true,
    hooks: [
      {
        hook_name: 'content.before_publish',
        function_arn: 'arn:aws:lambda:us-east-1:123456789012:function:seo-before-publish',
        priority: 10,
      },
      {
        hook_name: 'content.after_save',
        function_arn: 'arn:aws:lambda:us-east-1:123456789012:function:seo-after-save',
        priority: 20,
      },
    ],
    config_schema: {
      default_seo_title: {
        type: 'string',
        label: 'Default SEO Title',
        required: false,
        default: 'Example Site',
        description: 'Fallback SEO title used when content does not define one.',
        placeholder: 'Enter a default SEO title',
      },
      enable_analysis: {
        type: 'boolean',
        label: 'Enable SEO Analysis',
        required: false,
        default: true,
        description: 'Run SEO checks before publishing content.',
      },
      analysis_level: {
        type: 'select',
        label: 'Analysis Level',
        required: false,
        default: 'standard',
        options: ['basic', 'standard', 'strict'],
      },
    },
    installed_at: 1700000000,
    updated_at: 1700003600,
  };

  return { ...defaults, ...overrides };
}

export function createMockSettings(overrides?: Partial<SiteSettings>): SiteSettings {
  const defaults: SiteSettings = {
    site_title: 'Example CMS',
    site_description: 'A modern content management system for testing.',
    theme: 'default',
    registration_enabled: false,
    comments_enabled: true,
    comment_moderation_enabled: true,
    captcha_enabled: false,
  };

  return { ...defaults, ...overrides };
}

export function createMockComment(overrides?: Partial<Comment>): Comment {
  const defaults: Comment = {
    id: 'comment-001',
    content_id: 'content-001',
    author_name: 'Alex Reader',
    comment_text: 'This is a helpful article. Thanks for sharing!',
    status: 'approved',
    created_at: 1700000000,
  };

  return { ...defaults, ...overrides };
}

export function createMockContentList(count = 3): ContentListResponse {
  const items = Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(3, '0');

    return createMockContent({
      id: `content-${number}`,
      title: `Sample Content ${index + 1}`,
      slug: `sample-content-${index + 1}`,
      created_at: 1700000000 + index * 3600,
      updated_at: 1700003600 + index * 3600,
      published_at: 1700007200 + index * 3600,
    });
  });

  return { items };
}

export function createMockMediaList(count = 3): MediaListResponse {
  const items = Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(3, '0');

    return createMockMedia({
      id: `media-${number}`,
      filename: `sample-image-${number}.jpg`,
      s3_key: `uploads/2023/sample-image-${number}.jpg`,
      s3_url: `https://example.com/sample-image-${number}.jpg`,
      uploaded_at: 1700000000 + index * 3600,
    });
  });

  return { items };
}
