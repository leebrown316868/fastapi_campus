import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

/**
 * Protected Route Component
 *
 * @param requireAdmin - If true, only admin users can access
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not logged in - redirect to appropriate login page
  if (!isAuthenticated) {
    return <Navigate to={requireAdmin ? '/admin/login' : '/login'} replace />;
  }

  // Require admin but user is not admin
  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};
