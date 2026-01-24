// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Storage keys
const TOKEN_KEY = 'auth_token';
const USER_TYPE_KEY = 'user_login_type';

// Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
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
  };
}

export interface ApiError {
  detail: string;
}

// Base API client
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getHeaders(includeAuth = true): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || 'Request failed');
    }

    // Handle 204 No Content responses (DELETE requests)
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(endpoint: string): Promise<void> {
    await this.request<void>(endpoint, { method: 'DELETE' });
  }

  // Public requests (no auth required)
  async getPublic<T>(endpoint: string): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(false),
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || 'Request failed');
    }

    return response.json();
  }

  async postPublic<T>(endpoint: string, data?: unknown): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || 'Request failed');
    }

    return response.json();
  }
}

// Auth token management
export const setAuthToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const setUserType = (isAdmin: boolean) => {
  localStorage.setItem(USER_TYPE_KEY, isAdmin ? 'admin' : 'user');
};

export const getUserType = (): string | null => {
  return localStorage.getItem(USER_TYPE_KEY);
};

// Create API client instance
export const apiClient = new ApiClient(API_BASE_URL);

// Test connection
export const testConnection = async (): Promise<boolean> => {
  try {
    await apiClient.getPublic<{ status: string }>('/');
    return true;
  } catch {
    return false;
  }
};
