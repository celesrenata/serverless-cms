/// <reference types="vite/client" />
import axios, { AxiosInstance } from 'axios';
import { Content, ContentFilters, PaginatedResponse, SiteSettings } from '../types';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || '/api/v1',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: any) => response,
      (error: any) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Content endpoints
  async getContent(id: string): Promise<Content> {
    const response = await this.client.get(`/content/${id}`);
    return response.data;
  }

  async getContentBySlug(slug: string): Promise<Content> {
    const response = await this.client.get(`/content/slug/${slug}`);
    return response.data;
  }

  async listContent(filters: ContentFilters = {}): Promise<PaginatedResponse<Content>> {
    const params = new URLSearchParams();
    
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.last_key) params.append('last_key', filters.last_key);

    const response = await this.client.get('/content', { params });
    return response.data;
  }

  // Settings endpoints
  async getSettings(): Promise<SiteSettings> {
    const response = await this.client.get('/settings');
    return response.data;
  }
}

export const api = new ApiClient();
