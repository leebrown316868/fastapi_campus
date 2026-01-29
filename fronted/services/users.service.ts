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
  is_active: boolean;
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
   * Get all users (admin only) with filtering
   */
  async getAll(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    role?: string;
    is_active?: boolean;
  }): Promise<UserProfile[]> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.search !== undefined) queryParams.append('search', params.search);
    if (params?.role !== undefined) queryParams.append('role', params.role);
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());

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

  /**
   * Update user status (admin only)
   */
  async updateStatus(id: number, is_active: boolean): Promise<UserProfile> {
    return apiClient.patch<UserProfile>(`/api/users/${id}/status`, { is_active });
  },

  /**
   * Bulk update users (admin only)
   */
  async bulkUpdate(userIds: number[], is_active: boolean): Promise<{ updated: number }> {
    return apiClient.patch<{ updated: number }>('/api/users/bulk', {
      user_ids: userIds,
      is_active,
    });
  },

  /**
   * Bulk delete users (admin only)
   */
  async bulkDelete(userIds: number[]): Promise<{ deleted: number }> {
    return apiClient.delete<{ deleted: number }>(`/api/users/bulk`, {
      body: JSON.stringify({ user_ids: userIds }),
    });
  },

  /**
   * Delete user (admin only)
   */
  async delete(id: number): Promise<{ deleted: number }> {
    return apiClient.delete<{ deleted: number }>(`/api/users/${id}`);
  },

  /**
   * Export users to Excel (admin only)
   */
  async exportUsers(): Promise<void> {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const token = localStorage.getItem('auth_token');

    const response = await fetch(`${API_BASE_URL}/api/users/export`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // Handle auth errors - trigger reload to let AuthContext handle redirect
      if (response.status === 401 || response.status === 403) {
        window.location.href = '/';
      }
      throw new Error('Export failed');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'users_export.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Import users from CSV or Excel file (admin only)
   */
  async importUsers(file: File): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const token = localStorage.getItem('auth_token');

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/users/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      // Handle auth errors - trigger reload to let AuthContext handle redirect
      if (response.status === 401 || response.status === 403) {
        window.location.href = '/';
      }
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  },
};
