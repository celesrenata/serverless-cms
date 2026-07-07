import axios from 'axios';
import { AuthService } from './auth';
import type {
  Section,
  SectionTreeNode,
  CreateSectionRequest,
  UpdateSectionRequest,
} from '../../../shared/sections/types';

const BASE_URL = import.meta.env.VITE_API_ENDPOINT || '/api/v1';

function getAuthHeaders(): Record<string, string> {
  const token = AuthService.getIdToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export async function createSection(data: CreateSectionRequest): Promise<Section> {
  const response = await axios.post<Section>(`${BASE_URL}/sections`, data, {
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });
  return response.data;
}

export async function getSections(): Promise<SectionTreeNode[]> {
  const response = await axios.get<SectionTreeNode[]>(`${BASE_URL}/sections`, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function getSection(id: string): Promise<Section> {
  const response = await axios.get<Section>(`${BASE_URL}/sections/${id}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function updateSection(id: string, data: UpdateSectionRequest): Promise<Section> {
  const response = await axios.put<Section>(`${BASE_URL}/sections/${id}`, data, {
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });
  return response.data;
}

export async function deleteSection(id: string): Promise<void> {
  await axios.delete(`${BASE_URL}/sections/${id}`, {
    headers: getAuthHeaders(),
  });
}
