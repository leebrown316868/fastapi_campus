import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, AuthContextType } from '../types';
import { authService } from '../services';
import { apiClient } from '../services/api';
import { showToast } from '../components/Toast';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 保存用户类型的 key
const USER_TYPE_KEY = 'user_login_type';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  // 从 localStorage 读取初始状态
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        localStorage.removeItem('user');
        return null;
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(false);

  // Sync user state with localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('user');
      if (saved) {
        try {
          setUser(JSON.parse(saved));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Register auth error handler for automatic logout on 401/403
  useEffect(() => {
    const handleAuthError = () => {
      // Don't redirect if already on login pages (user might be entering wrong password)
      const currentPath = window.location.hash.replace('#', '') || '/';
      if (currentPath === '/login' || currentPath === '/admin/login') {
        // Just clear state without redirecting
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        localStorage.removeItem(USER_TYPE_KEY);
        return;
      }

      // Get login type to determine redirect path
      const loginType = localStorage.getItem(USER_TYPE_KEY);
      const targetPath = loginType === 'admin' ? '/admin/login' : '/login';

      // Clear user state
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('auth_token');
      localStorage.removeItem(USER_TYPE_KEY);

      // Navigate to login
      navigate(targetPath);

      // Show toast
      showToast('登录已过期，请重新登录', 'warning');
    };

    apiClient.setAuthErrorHandler(handleAuthError);

    // Cleanup on unmount
    return () => {
      apiClient.setAuthErrorHandler(null);
    };
  }, [navigate]);

  const login = useCallback(async (username: string, password: string, isAdmin: boolean) => {
    setIsLoading(true);
    try {
      const response = await authService.login(username, password, isAdmin);

      // Check if role matches the login type
      if (isAdmin && response.user.role !== 'admin') {
        showToast('该账号不是管理员账号', 'error');
        // Clear the session and token but don't call logout (avoids navigation)
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        return;
      }

      if (!isAdmin && response.user.role !== 'user') {
        showToast('该账号不是学生账号', 'error');
        // Clear the session and token but don't call logout (avoids navigation)
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        return;
      }

      // Update user state (authService already stores in localStorage)
      const userObj: User = {
        id: response.user.id.toString(),
        studentId: response.user.student_id,
        email: response.user.email,
        name: response.user.name,
        role: response.user.role,
        avatar: response.user.avatar,
        major: response.user.major,
        bio: response.user.bio,
        phone: response.user.phone,
        isVerified: response.user.is_verified,
        showNameInLostItem: response.user.show_name_in_lost_item,
        showAvatarInLostItem: response.user.show_avatar_in_lost_item,
        showEmailInLostItem: response.user.show_email_in_lost_item,
        showPhoneInLostItem: response.user.show_phone_in_lost_item,
      };

      setUser(userObj);
      localStorage.setItem('user', JSON.stringify(userObj));
      localStorage.setItem(USER_TYPE_KEY, isAdmin ? 'admin' : 'user');

      showToast(`欢迎回来，${response.user.name}！`, 'success');

      // Navigate based on role
      if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/home');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : '登录失败，请检查用户名和密码', 'error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const logout = useCallback(async (redirectTo?: string) => {
    // 从 localStorage 读取登录类型
    const loginType = localStorage.getItem(USER_TYPE_KEY);
    const defaultPath = loginType === 'admin' ? '/admin/login' : '/login';
    const targetPath = redirectTo || defaultPath;

    try {
      await authService.logout();
    } catch {
      // Ignore logout errors
    }

    setUser(null);
    navigate(targetPath);
    showToast('已安全退出', 'success');
  }, [navigate]);

  const refreshUser = useCallback(async () => {
    try {
      const response = await authService.getMe();
      const userObj: User = {
        id: response.id.toString(),
        studentId: response.student_id,
        email: response.email,
        name: response.name,
        role: response.role,
        avatar: response.avatar,
        major: response.major,
        bio: response.bio,
        phone: response.phone,
        isVerified: response.is_verified,
        showNameInLostItem: response.show_name_in_lost_item,
        showAvatarInLostItem: response.show_avatar_in_lost_item,
        showEmailInLostItem: response.show_email_in_lost_item,
        showPhoneInLostItem: response.show_phone_in_lost_item,
      };
      setUser(userObj);
      localStorage.setItem('user', JSON.stringify(userObj));
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
