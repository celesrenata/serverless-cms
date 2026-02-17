export interface Content {
  id: string;
  type: 'post' | 'page' | 'gallery' | 'project';
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  author: string;
  author_name?: string; // Enriched from user table
  status: 'draft' | 'published' | 'archived';
  featured_image: string;
  metadata: {
    seo_title?: string;
    seo_description?: string;
    tags?: string[];
    categories?: string[];
    media?: Media[];
    custom_fields?: Record<string, any>;
  };
  created_at: number;
  updated_at: number;
  published_at?: number;
  scheduled_at?: number;
}

export interface Media {
  id: string;
  filename: string;
  s3_key: string;
  s3_url: string;
  mime_type: string;
  size: number;
  dimensions?: {
    width: number;
    height: number;
  };
  thumbnails?: {
    small: string;
    medium: string;
    large: string;
  };
  metadata?: {
    alt_text?: string;
    caption?: string;
    exif?: Record<string, any>;
  };
  uploaded_by: string;
  uploaded_at: number;
}

export interface SiteSettings {
  site_title: string;
  site_description: string;
  theme?: string;
  registration_enabled: boolean;
  comments_enabled: boolean;
  captcha_enabled: boolean;
  [key: string]: any;
}

export interface ContentFilters {
  type?: string;
  status?: string;
  category?: string;
  tag?: string;
  limit?: number;
  last_key?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  last_key?: Record<string, any>;
}
