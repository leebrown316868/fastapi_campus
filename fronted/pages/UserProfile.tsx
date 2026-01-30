import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usersService } from '../services/users.service';
import { useAuth } from '../contexts/AuthContext';
import DottedBackground from '../components/DottedBackground';
import { showToast } from '../components/Toast';

const UserProfile: React.FC = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;

      try {
        setIsLoading(true);
        const data = await usersService.getById(parseInt(userId));
        setUser(data);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        showToast('加载用户信息失败', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  // Check if viewing own profile
  const isOwnProfile = currentUser && user && currentUser.id === user.id.toString();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4"></div>
          <p className="text-slate-500 font-bold">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-3xl p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-300">person_off</span>
          <h2 className="mt-4 text-xl font-bold text-slate-900">用户未找到</h2>
          <p className="mt-2 text-slate-500">该用户可能已被删除或不存在</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl bg-primary text-white font-bold hover:bg-blue-600 transition-colors"
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <DottedBackground />
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        {/* Navigation */}
        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium mb-8">
          <Link to="/home" className="hover:text-primary hover:underline decoration-primary/30 underline-offset-4">首页</Link>
          <span className="material-symbols-outlined text-xs text-slate-400">chevron_right</span>
          <span className="text-slate-900 font-bold">用户资料</span>
        </div>

        {/* User Card */}
        <div className="glass-card rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            {/* Avatar - based on privacy settings */}
            <div className="mb-6">
              <div className="size-32 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white text-5xl font-bold shadow-xl overflow-hidden">
                {(isOwnProfile || user.show_avatar_in_lost_item !== false) && user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  (isOwnProfile || user.show_name_in_lost_item !== false)
                    ? (user.name?.[0] || user.email?.[0] || 'U')
                    : (user.email?.[0] || 'U')
                )}
              </div>
            </div>

            {/* Name & Role - name based on privacy settings */}
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
              {isOwnProfile || user.show_name_in_lost_item !== false
                ? user.name
                : '匿名用户'
              }
            </h1>
            <div className="flex items-center gap-2 mb-6">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                user.role === 'admin'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {user.role === 'admin' ? '管理员' : '学生'}
              </span>
              {user.is_verified && (
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  已认证
                </span>
              )}
            </div>

            {/* Info Grid - based on privacy settings */}
            <div className="w-full bg-white/40 rounded-xl p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.student_id && (
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined">badge</span>
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-slate-500">学号</p>
                      <p className="font-bold text-slate-900">{user.student_id}</p>
                    </div>
                  </div>
                )}
                {user.major && (
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                      <span className="material-symbols-outlined">school</span>
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-slate-500">专业</p>
                      <p className="font-bold text-slate-900">{user.major}</p>
                    </div>
                  </div>
                )}
                {/* Phone - based on privacy settings */}
                {(!isOwnProfile && !user.show_phone_in_lost_item) ? null : user.phone ? (
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
                      <span className="material-symbols-outlined">phone</span>
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-slate-500">手机</p>
                      <p className="font-bold text-slate-900">{user.phone}</p>
                    </div>
                  </div>
                ) : !isOwnProfile && !user.show_phone_in_lost_item ? (
                  <div className="flex items-center gap-3 opacity-50">
                    <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <span className="material-symbols-outlined">lock</span>
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-slate-500">手机</p>
                      <p className="font-bold text-slate-400 text-sm">未公开</p>
                    </div>
                  </div>
                ) : null}
                {/* Email - based on privacy settings */}
                {(!isOwnProfile && !user.show_email_in_lost_item) ? null : (
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                      <span className="material-symbols-outlined">email</span>
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-slate-500">邮箱</p>
                      <p className="font-bold text-slate-900 text-sm">{user.email}</p>
                    </div>
                  </div>
                )}
                {!isOwnProfile && !user.show_email_in_lost_item && (
                  <div className="flex items-center gap-3 opacity-50">
                    <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <span className="material-symbols-outlined">lock</span>
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-slate-500">邮箱</p>
                      <p className="font-bold text-slate-400 text-sm">未公开</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bio */}
            {user.bio && (
              <div className="w-full bg-white/40 rounded-xl p-6 mb-6 text-left">
                <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">个人简介</h3>
                <p className="text-slate-700 leading-relaxed">{user.bio}</p>
              </div>
            )}

            {/* Back Button */}
            <Link
              to="/lost-and-found"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              返回失物招领
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
