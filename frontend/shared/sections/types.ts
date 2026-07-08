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
}

export interface UpdateSectionRequest {
  name?: string;
  slug?: string;
  parent_id?: string | null;
  description?: string;
  sort_order?: number;
}
