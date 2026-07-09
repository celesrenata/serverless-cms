import axios from 'axios';
import { SectionTreeNode } from '../../../shared/sections/types';
import type { LandingPage } from '../../../shared/sections/types';
import { Content } from '../types';

const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

const client = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

export interface SectionPostsPagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface SectionPostsResponse {
  items: Content[];
  pagination: SectionPostsPagination;
  landing_page?: LandingPage;
}

/**
 * Fetch the full section tree (unauthenticated).
 * The API may return a raw array or { items: [...] } wrapper.
 */
export async function fetchSectionTree(): Promise<SectionTreeNode[]> {
  const response = await client.get<SectionTreeNode[] | { items: SectionTreeNode[] }>('/public/sections/tree');
  const data = response.data;
  return Array.isArray(data) ? data : (data.items || []);
}

/**
 * Resolve a section by its slug path (unauthenticated).
 * @param path - Slash-separated slug path, e.g. "technology/web-development"
 */
export async function fetchSectionByPath(path: string): Promise<SectionTreeNode> {
  const response = await client.get<SectionTreeNode>(`/public/sections/path/${path}`);
  return response.data;
}

/**
 * Fetch paginated posts for a section (unauthenticated).
 * @param sectionId - The section's UUID
 * @param page - Page number (1-indexed)
 */
export async function fetchSectionPosts(sectionId: string, page: number = 1): Promise<SectionPostsResponse> {
  const response = await client.get<SectionPostsResponse>(`/public/sections/${sectionId}/posts`, {
    params: { page },
  });
  return response.data;
}
