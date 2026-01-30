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
  review_status: 'pending' | 'approved' | 'rejected';
  publisher?: Publisher;
  created_at: string;
}

export const lostItemsService = {
  /**
   * Get all lost items (public - but requires auth to see user's own items)
   */
  async getAll(params?: {
    type?: 'lost' | 'found';
    category?: string;
    created_by?: number;
    review_status?: 'pending' | 'approved' | 'rejected';
    skip?: number;
    limit?: number;
  }): Promise<LostItem[]> {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.created_by !== undefined) queryParams.append('created_by', params.created_by.toString());
    if (params?.review_status) queryParams.append('review_status', params.review_status);
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    // Use authenticated request so backend can identify the user
    return apiClient.get<LostItem[]>(
      `/api/lost-items${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Get lost item by ID (public - but requires auth to see user's own items)
   */
  async getById(id: number): Promise<LostItem> {
    // Use authenticated request so backend can identify the user
    return apiClient.get<LostItem>(`/api/lost-items/${id}`);
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
   * Review lost item (admin only)
   */
  async review(id: number, approve: boolean): Promise<LostItem> {
    return apiClient.post<LostItem>(`/api/lost-items/${id}/review?approve=${approve}`, {});
  },

  /**
   * Batch delete lost items (admin only)
   */
  async batchDelete(ids: number[]): Promise<{ deleted: number }> {
    return apiClient.post<{ deleted: number }>('/api/lost-items/batch-delete', { item_ids: ids });
  },

  /**
   * Delete lost item (owner or admin)
   */
  async delete(id: number): Promise<void> {
    return apiClient.delete(`/api/lost-items/${id}`);
  },
};
