import axios, { AxiosInstance, AxiosError } from 'axios';
import { AuthService } from './auth';
import {
  Content,
  ContentCreate,
  ContentUpdate,
  ContentFilters,
  ContentListResponse,
  Media,
  MediaUpdate,
  MediaListResponse,
  User,
  UserUpdate,
  Plugin,
  PluginSettings,
  SiteSettings,
  SettingsUpdate,
} from '../types';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = AuthService.getIdToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response) {
          const { status, data } = error.response;
          
          // Handle token expiration
          if (status === 401) {
            try {
              await AuthService.refreshToken();
              // Retry the original request
              return this.client.request(error.config!);
            } catch (refreshError) {
              // Refresh failed, logout user
              AuthService.logout();
              window.location.href = '/login';
              throw new ApiError('Session expired', 401);
            }
          }
          
          throw new ApiError(
            (data as { error?: string })?.error || 'An error occurred',
            status,
            data as Record<string, unknown>
          );
        }
        
        throw new ApiError('Network error', 0);
      }
    );
  }

  // Content API methods
  async createContent(data: ContentCreate): Promise<Content> {
    const response = await this.client.post<Content>('/content', data);
    return response.data;
  }

  async getContent(id: string): Promise<Content> {
    const response = await this.client.get<Content>(`/content/${id}`);
    return response.data;
  }

  async getContentBySlug(slug: string): Promise<Content> {
    const response = await this.client.get<Content>(`/content/slug/${slug}`);
    return response.data;
  }

  async updateContent(id: string, data: ContentUpdate): Promise<Content> {
    const response = await this.client.put<Content>(`/content/${id}`, data);
    return response.data;
  }

  async deleteContent(id: string): Promise<void> {
    await this.client.delete(`/content/${id}`);
  }

  async listContent(filters?: ContentFilters): Promise<ContentListResponse> {
    const response = await this.client.get<ContentListResponse>('/content', {
      params: filters,
    });
    return response.data;
  }

  // Media API methods
  async uploadMedia(file: File, metadata?: Record<string, string>): Promise<Media> {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await this.client.post<Media>('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getMedia(id: string): Promise<Media> {
    const response = await this.client.get<Media>(`/media/${id}`);
    return response.data;
  }

  async updateMedia(id: string, data: MediaUpdate): Promise<Media> {
    const response = await this.client.put<Media>(`/media/${id}`, data);
    return response.data;
  }

  async deleteMedia(id: string): Promise<void> {
    await this.client.delete(`/media/${id}`);
  }

  async listMedia(params?: { limit?: number; last_key?: string }): Promise<MediaListResponse> {
    const response = await this.client.get<MediaListResponse>('/media', { params });
    return response.data;
  }

  // User API methods
  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<User>('/users/me');
    return response.data;
  }

  async updateCurrentUser(data: UserUpdate): Promise<User> {
    const response = await this.client.put<User>('/users/me', data);
    return response.data;
  }

  async listUsers(): Promise<User[]> {
    const response = await this.client.get<User[]>('/users');
    return response.data;
  }

  // Settings API methods
  async getSettings(): Promise<SiteSettings> {
    const response = await this.client.get<SiteSettings>('/settings');
    return response.data;
  }

  async updateSettings(data: SettingsUpdate): Promise<SiteSettings> {
    const response = await this.client.put<SiteSettings>('/settings', data);
    return response.data;
  }

  // Plugin API methods
  async installPlugin(file: File): Promise<Plugin> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post<Plugin>('/plugins/install', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async activatePlugin(id: string): Promise<Plugin> {
    const response = await this.client.post<Plugin>(`/plugins/${id}/activate`);
    return response.data;
  }

  async deactivatePlugin(id: string): Promise<Plugin> {
    const response = await this.client.post<Plugin>(`/plugins/${id}/deactivate`);
    return response.data;
  }

  async listPlugins(): Promise<Plugin[]> {
    const response = await this.client.get<Plugin[]>('/plugins');
    return response.data;
  }

  async getPluginSettings(id: string): Promise<PluginSettings> {
    const response = await this.client.get<PluginSettings>(`/plugins/${id}/settings`);
    return response.data;
  }

  async updatePluginSettings(id: string, settings: PluginSettings): Promise<PluginSettings> {
    const response = await this.client.put<PluginSettings>(
      `/plugins/${id}/settings`,
      settings
    );
    return response.data;
  }
}

// Export singleton instance
export const api = new ApiClient();
