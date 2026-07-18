export interface Section {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  description: string;
  sort_order: number;
  path: string;
  path_ids: string[];
  depth: number;
  page_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface SectionTreeNode extends Section {
  children: SectionTreeNode[];
}

export interface CreateSectionRequest {
  name: string;
  slug: string;
  parent_id?: string | null;
  description?: string;
  sort_order?: number;
  page_id?: string | null;
}

export interface UpdateSectionRequest {
  name?: string;
  slug?: string;
  parent_id?: string | null;
  description?: string;
  sort_order?: number;
  page_id?: string | null;
}

export interface LandingPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  featured_image: string;
  excerpt: string;
  author_name?: string;
  published_at?: number;
}
