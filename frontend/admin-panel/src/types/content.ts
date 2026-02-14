export type ContentType = 'post' | 'page' | 'gallery' | 'project';
export type ContentStatus = 'draft' | 'published' | 'archived';

export interface ContentMetadata {
  seo_title?: string;
  seo_description?: string;
  tags?: string[];
  categories?: string[];
  custom_fields?: Record<string, string | number | boolean>;
}

export interface Content {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  author: string;
  status: ContentStatus;
  featured_image?: string;
  metadata: ContentMetadata;
  created_at: number;
  updated_at: number;
  published_at?: number;
  scheduled_at?: number;
}

export interface ContentCreate {
  type: ContentType;
  title: string;
  slug?: string;
  content: string;
  excerpt?: string;
  status?: ContentStatus;
  featured_image?: string;
  metadata?: ContentMetadata;
  scheduled_at?: number;
}

export interface ContentUpdate {
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  status?: ContentStatus;
  featured_image?: string;
  metadata?: ContentMetadata;
  scheduled_at?: number;
}

export interface ContentFilters {
  type?: ContentType;
  status?: ContentStatus;
  author?: string;
  limit?: number;
  last_key?: string;
}

export interface ContentListResponse {
  items: Content[];
  last_key?: Record<string, string>;
}
