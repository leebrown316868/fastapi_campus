import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, AuthContextType } from '../types';
import { authService } from '../services';
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

  const login = useCallback(async (username: string, password: string, isAdmin: boolean) => {
    setIsLoading(true);
    try {
      const response = await authService.login(username, password, isAdmin);

      // Check if role matches the login type
      if (isAdmin && response.user.role !== 'admin') {
        showToast('该账号不是管理员账号', 'error');
        await authService.logout();
        return;
      }

      if (!isAdmin && response.user.role !== 'user') {
        showToast('该账号不是学生账号', 'error');
        await authService.logout();
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
