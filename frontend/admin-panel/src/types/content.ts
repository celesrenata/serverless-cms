export type ContentType = 'post' | 'page' | 'gallery' | 'project';
export type ContentStatus = 'draft' | 'published' | 'archived';

export interface ContentMetadata {
  seo_title?: string;
  seo_description?: string;
  tags?: string[];
  categories?: string[];
  custom_fields?: Record<string, string | number | boolean>;
}

export type ContentFormat = 'markdown' | 'html';

export interface Content {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  content: string;
  content_markdown?: string;
  content_format?: ContentFormat;
  excerpt: string;
  author: string;
  author_name?: string;
  status: ContentStatus;
  featured_image?: string;
  metadata: ContentMetadata;
  section_id?: string;
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
  content_markdown?: string;
  content_format?: ContentFormat;
  excerpt?: string;
  status?: ContentStatus;
  featured_image?: string;
  metadata?: ContentMetadata;
  section_id?: string;
  scheduled_at?: number;
}

export interface ContentUpdate {
  title?: string;
  slug?: string;
  content?: string;
  content_markdown?: string;
  content_format?: ContentFormat;
  excerpt?: string;
  status?: ContentStatus;
  featured_image?: string;
  metadata?: ContentMetadata;
  section_id?: string;
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
  total_count?: number;
  published_count?: number;
}
