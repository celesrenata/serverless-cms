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

  async getPublicSettings(): Promise<SiteSettings> {
    const response = await this.client.get('/settings/public');
    return response.data;
  }

  // Comments endpoints
  async getComments(contentId: string) {
    const response = await this.client.get(`/content/${contentId}/comments`);
    return response.data.comments || [];
  }

  async createComment(contentId: string, data: {
    author_name: string;
    author_email: string;
    comment_text: string;
    parent_id?: string;
  }) {
    try {
      const response = await this.client.post(`/content/${contentId}/comments`, data);
      return response.data;
    } catch (error: any) {
      // Extract error message from API response
      const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to submit comment';
      throw new Error(message);
    }
  }

  // Registration endpoints
  async register(data: {
    email: string;
    password: string;
    name: string;
  }) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async verifyEmail(email: string, code: string) {
    const response = await this.client.post('/auth/verify-email', { email, code });
    return response.data;
  }

  async resendVerification(email: string) {
    const response = await this.client.post('/auth/resend-verification', { email });
    return response.data;
  }
}

export const api = new ApiClient();
