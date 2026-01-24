import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';

// Pages
const Home = lazy(() => import('./pages/Home'));
const Notifications = lazy(() => import('./pages/Notifications'));
const LostAndFound = lazy(() => import('./pages/LostAndFound'));
const ItemDetail = lazy(() => import('./pages/ItemDetail'));
const Publish = lazy(() => import('./pages/Publish'));
const EditContent = lazy(() => import('./pages/EditContent'));
const Activities = lazy(() => import('./pages/Activities'));
const ActivityDetail = lazy(() => import('./pages/ActivityDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const ProfileEdit = lazy(() => import('./pages/ProfileEdit'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/Login'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

// 加载动画组件
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
  </div>
);

// 根路径跳转组件
const RootRedirect: React.FC = () => {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? '/home' : '/login'} replace />;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* 根路径：根据登录状态跳转 */}
            <Route path="/" element={<RootRedirect />} />

            {/* 独立页面（无 Layout） */}
            <Route path="/login" element={
              <Suspense fallback={<LoadingSpinner />}>
                <Login />
              </Suspense>
            } />

            <Route path="/admin/login" element={
              <Suspense fallback={<LoadingSpinner />}>
                <AdminLogin />
              </Suspense>
            } />

            {/* 主应用页面（带 Layout） */}
            <Route path="/*" element={
              <Layout>
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  </div>
                }>
                  <Routes>
                    <Route path="/home" element={<Home />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/lost-and-found" element={<LostAndFound />} />
                    <Route path="/lost-and-found/:id" element={<ItemDetail />} />
                    <Route path="/activities" element={<Activities />} />
                    <Route path="/activities/:id" element={<ActivityDetail />} />
                    <Route path="/publish" element={<Publish />} />
                    <Route path="/edit/:type/:id" element={<EditContent />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/profile/edit" element={<ProfileEdit />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute requireAdmin={true}>
                          <AdminDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                  </Routes>
                </Suspense>
              </Layout>
            } />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;