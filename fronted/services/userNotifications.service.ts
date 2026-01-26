/**
 * User notification service for personal notifications.
 */

import { apiClient } from './api';

export interface UserNotification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  content: string;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
  related_id: number | null;
}

export const userNotificationsService = {
  /**
   * Get current user's notifications
   */
  async getAll(params?: {
    skip?: number;
    limit?: number;
  }): Promise<UserNotification[]> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    return apiClient.get<UserNotification[]>(
      `/api/notifications/me${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Get unread count
   */
  async getUnreadCount(): Promise<{ unread_count: number }> {
    return apiClient.get<{ unread_count: number }>('/api/notifications/me/unread-count');
  },

  /**
   * Mark notification as read
   */
  async markAsRead(id: number): Promise<UserNotification> {
    return apiClient.patch<UserNotification>(`/api/notifications/me/${id}/read`, {});
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/api/notifications/me/read-all', {});
  },

  /**
   * Delete notification
   */
  async delete(id: number): Promise<void> {
    return apiClient.delete(`/api/notifications/me/${id}`);
  },
};
