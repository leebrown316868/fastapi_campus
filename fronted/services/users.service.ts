import { apiClient } from './api';

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  student_id: string;
  role: 'user' | 'admin';
  avatar?: string;
  major?: string;
  bio?: string;
  phone?: string;
  is_verified: boolean;
  created_at: string;
}

export const usersService = {
  /**
   * Get current user profile
   */
  async getMe(): Promise<UserProfile> {
    return apiClient.get<UserProfile>('/api/users/me');
  },

  /**
   * Update current user profile
   */
  async updateMe(data: {
    name?: string;
    major?: string;
    bio?: string;
    phone?: string;
    avatar?: string;
  }): Promise<UserProfile> {
    return apiClient.patch<UserProfile>('/api/users/me', data);
  },

  /**
   * Change password
   */
  async changePassword(data: {
    old_password: string;
    new_password: string;
  }): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/api/users/me/change-password', data);
  },

  /**
   * Get all users (admin only)
   */
  async getAll(params?: { skip?: number; limit?: number }): Promise<UserProfile[]> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    return apiClient.get<UserProfile[]>(
      `/api/users${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Get user by ID (admin only)
   */
  async getById(id: number): Promise<UserProfile> {
    return apiClient.get<UserProfile>(`/api/users/${id}`);
  },
};
