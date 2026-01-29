import { apiClient } from './api';

export interface Notification {
  id: number;
  title: string;
  content: string;
  course: string;
  author: string;
  avatar?: string;
  location?: string;
  is_important: boolean;
  attachment?: string;
  attachment_name?: string;
  time: string;
  created_at: string;
}

export const notificationsService = {
  /**
   * Get all notifications (public)
   */
  async getAll(params?: {
    created_by?: number;
    skip?: number;
    limit?: number;
  }): Promise<Notification[]> {
    const queryParams = new URLSearchParams();
    if (params?.created_by !== undefined) queryParams.append('created_by', params.created_by.toString());
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    return apiClient.getPublic<Notification[]>(
      `/api/notifications${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Get notification by ID (public)
   */
  async getById(id: number): Promise<Notification> {
    return apiClient.getPublic<Notification>(`/api/notifications/${id}`);
  },

  /**
   * Create notification (admin only)
   */
  async create(data: {
    title: string;
    content: string;
    course: string;
    author: string;
    avatar?: string;
    location?: string;
    is_important?: boolean;
    attachment?: string;
    attachment_name?: string;
  }): Promise<Notification> {
    return apiClient.post<Notification>('/api/notifications', data);
  },

  /**
   * Delete notification (admin only)
   */
  async delete(id: number): Promise<void> {
    return apiClient.delete(`/api/notifications/${id}`);
  },

  /**
   * Batch delete notifications (admin only)
   */
  async batchDelete(ids: number[]): Promise<{ deleted: number }> {
    return apiClient.post<{ deleted: number }>('/api/notifications/batch-delete', { notification_ids: ids });
  },

  /**
   * Update notification (admin only)
   */
  async update(id: number, data: {
    title?: string;
    content?: string;
    course?: string;
    author?: string;
    avatar?: string;
    location?: string;
    is_important?: boolean;
  }): Promise<Notification> {
    return apiClient.patch<Notification>(`/api/notifications/${id}`, data);
  },
};
