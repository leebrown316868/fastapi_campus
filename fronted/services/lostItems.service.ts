import { apiClient } from './api';

export interface Publisher {
  name: string;
  avatar: string;
}

export interface LostItem {
  id: number;
  title: string;
  type: 'lost' | 'found';
  category: string;
  description: string;
  location: string;
  time: string;
  images: string[];
  tags: string[];
  status: string;
  publisher?: Publisher;
  created_at: string;
}

export const lostItemsService = {
  /**
   * Get all lost items (public)
   */
  async getAll(params?: {
    type?: 'lost' | 'found';
    category?: string;
    created_by?: number;
    skip?: number;
    limit?: number;
  }): Promise<LostItem[]> {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.created_by !== undefined) queryParams.append('created_by', params.created_by.toString());
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    return apiClient.getPublic<LostItem[]>(
      `/api/lost-items${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Get lost item by ID (public)
   */
  async getById(id: number): Promise<LostItem> {
    return apiClient.getPublic<LostItem>(`/api/lost-items/${id}`);
  },

  /**
   * Create lost item (authenticated users)
   */
  async create(data: {
    title: string;
    type: 'lost' | 'found';
    category: string;
    description: string;
    location: string;
    time: string;
    images?: string[];
    tags?: string[];
  }): Promise<LostItem> {
    return apiClient.post<LostItem>('/api/lost-items', data);
  },

  /**
   * Update lost item (owner or admin)
   */
  async update(id: number, data: Partial<{
    title: string;
    category: string;
    description: string;
    location: string;
    images: string[];
    tags: string[];
    status: string;
  }>): Promise<LostItem> {
    return apiClient.patch<LostItem>(`/api/lost-items/${id}`, data);
  },

  /**
   * Delete lost item (owner or admin)
   */
  async delete(id: number): Promise<void> {
    return apiClient.delete(`/api/lost-items/${id}`);
  },
};
