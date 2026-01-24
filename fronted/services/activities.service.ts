import { apiClient } from './api';

export interface Activity {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  organizer: string;
  image: string;
  category: string;
  status: string;
  created_at: string;
}

export const activitiesService = {
  /**
   * Get all activities (public)
   */
  async getAll(params?: {
    category?: string;
    status?: string;
    created_by?: number;
    skip?: number;
    limit?: number;
  }): Promise<Activity[]> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.created_by !== undefined) queryParams.append('created_by', params.created_by.toString());
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    return apiClient.getPublic<Activity[]>(
      `/api/activities${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Get activity by ID (public)
   */
  async getById(id: number): Promise<Activity> {
    return apiClient.getPublic<Activity>(`/api/activities/${id}`);
  },

  /**
   * Create activity (admin only)
   */
  async create(data: {
    title: string;
    description: string;
    date: string;
    location: string;
    organizer: string;
    image: string;
    category: string;
    status?: string;
  }): Promise<Activity> {
    return apiClient.post<Activity>('/api/activities', data);
  },

  /**
   * Delete activity (admin only)
   */
  async delete(id: number): Promise<void> {
    return apiClient.delete(`/api/activities/${id}`);
  },

  /**
   * Update activity (admin only)
   */
  async update(id: number, data: {
    title?: string;
    description?: string;
    date?: string;
    location?: string;
    organizer?: string;
    image?: string;
    category?: string;
    status?: string;
  }): Promise<Activity> {
    return apiClient.patch<Activity>(`/api/activities/${id}`, data);
  },
};
