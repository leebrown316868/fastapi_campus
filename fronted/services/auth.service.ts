import { apiClient, setAuthToken, setUserType, type LoginRequest, type LoginResponse } from './api';

export const authService = {
  /**
   * Login with email or student_id
   */
  async login(username: string, password: string, isAdmin: boolean): Promise<LoginResponse> {
    const response = await apiClient.postPublic<LoginResponse>('/api/auth/login', {
      username,
      password,
    });

    // Store token and user type
    setAuthToken(response.access_token);
    setUserType(isAdmin);

    // Store user data
    localStorage.setItem('user', JSON.stringify({
      id: response.user.id.toString(),
      email: response.user.email,
      name: response.user.name,
      studentId: response.user.student_id,
      role: response.user.role,
      avatar: response.user.avatar,
    }));

    return response;
  },

  /**
   * Logout (clears local storage)
   */
  async logout(): Promise<void> {
    await apiClient.postPublic('/api/auth/logout');
    // Clear all auth data
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_login_type');
  },

  /**
   * Get current user from localStorage
   */
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },

  /**
   * Get current user from API
   */
  async getMe() {
    return apiClient.get('/api/users/me');
  },
};
