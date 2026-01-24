import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { lostItemsService } from '../services/lostItems.service';
import { notificationsService } from '../services/notifications.service';
import { activitiesService } from '../services/activities.service';
import { usersService } from '../services/users.service';
import { showToast } from '../components/Toast';

type TabType = 'posts' | 'edit-profile' | 'change-password';

const Profile: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [myLostItems, setMyLostItems] = useState<any[]>([]);
  const [myNotifications, setMyNotifications] = useState<any[]>([]);
  const [myActivities, setMyActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    major: user?.major || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  // Load user's published content
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        const userId = parseInt(user.id);
        const lostItems = await lostItemsService.getAll({ created_by: userId });
        setMyLostItems(lostItems);

        if (user.role === 'admin') {
          const notifications = await notificationsService.getAll({ created_by: userId });
          setMyNotifications(notifications);
        }

        if (user.role === 'admin') {
          const activities = await activitiesService.getAll({ created_by: userId });
          setMyActivities(activities);
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  // Update profile form when user data changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        major: user.major || '',
        bio: user.bio || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleProfileSave = async () => {
    if (isSaving) return;

    try {
      setIsSaving(true);
      await usersService.updateMe(profileForm);
      await refreshUser();
      showToast('个人资料更新成功！', 'success');
    } catch (error: any) {
      console.error('Update profile error:', error);
      showToast(error.message || '更新失败，请稍后重试', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (isSaving) return;

    if (!passwordForm.old_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      showToast('请填写所有字段', 'error');
      return;
    }

    if (passwordForm.new_password.length < 6) {
      showToast('新密码长度至少为6位', 'error');
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showToast('两次输入的新密码不一致', 'error');
      return;
    }

    try {
      setIsSaving(true);
      await usersService.changePassword({
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
      });
      showToast('密码修改成功！', 'success');
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (error: any) {
      console.error('Change password error:', error);
      showToast(error.message || '密码修改失败', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  const userData = {
    major: user.major || '未设置专业',
    bio: user.bio || '这个人很懒，什么都没有写~',
    avatar: user.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCUtxxC52ARabd-8SDwIbftfDI6ffT14_teLYKKqt0ptE9jATkW5nDw_NbrfEMy0oqANCqIxmTTblvFVQ-m1L2OTJm4i6rleTc0SYELXCD-ThiXcS3mjg-PIfVU4ToWOsIm-e5Ebm_la-c6TANnBdV1tu-Fc1Qt7KBZGpKL1kI20f9aJfLVcmUVb8MbSv0dXBprfi3j1sNFeGD-ud5eddnfTks1_UTxE0UvfXAsxAorLfWZoJJxEd8l32iXZ3PlWAzOUj2W7WpAZMSm',
    isVerified: user.is_verified || false
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 py-8 md:px-12 lg:px-16 scroll-smooth">
        <div className="mx-auto max-w-4xl">
          {/* Profile Header Card */}
          <section className="glass-card rounded-[2.5rem] overflow-hidden border-0 shadow-2xl relative mb-8">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary/20 via-emerald-200/20 to-primary/20"></div>
            <div className="p-8 lg:p-12 relative flex flex-col md:flex-row items-center gap-8 mt-6">
              <div className="relative group">
                <div className="size-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-slate-100">
                  <img src={userData.avatar} alt={user.name} className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="text-center md:text-left flex-grow">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                  <h1 className="text-3xl font-extrabold text-slate-900">{user.name}</h1>
                  <span className={`px-2 py-0.5 rounded-md text-white text-[10px] font-bold uppercase tracking-wider ${
                    user.role === 'admin' ? 'bg-red-500' : 'bg-primary'
                  }`}>
                    {user.role === 'admin' ? '管理员' : '学生'}
                  </span>
                  {userData.isVerified && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[10px]">verified</span>
                      已认证
                    </span>
                  )}
                </div>
                <p className="text-slate-500 font-medium mb-4">{userData.major} • 学号：{user.studentId || user.id}</p>
                <p className="text-sm text-slate-600 mb-4">{userData.bio}</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                  <span className="px-4 py-1.5 rounded-full bg-white/60 border border-white text-xs font-bold text-slate-700 shadow-sm">
                    <span className="material-symbols-outlined text-sm align-middle mr-1">mail</span>
                    {user.email}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => logout()}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-500/25 hover:bg-red-600 transition-all"
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                  退出登录
                </button>
              </div>
            </div>
          </section>

          {/* Content Tabs */}
          <section className="glass-card rounded-3xl p-6 lg:p-8">
            <div className="flex items-center gap-6 mb-6 border-b border-slate-200/50 overflow-x-auto">
              <button
                onClick={() => setActiveTab('posts')}
                className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === 'posts'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                我的发布
              </button>
              <button
                onClick={() => setActiveTab('edit-profile')}
                className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === 'edit-profile'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                编辑资料
              </button>
              <button
                onClick={() => setActiveTab('change-password')}
                className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === 'change-password'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                修改密码
              </button>
            </div>

            {/* Posts Tab */}
            {activeTab === 'posts' && (
              <div className="space-y-3">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block size-8 border-3 border-slate-200 border-t-primary rounded-full animate-spin"></div>
                    <p className="mt-3 text-slate-500 font-medium">加载中...</p>
                  </div>
                ) : myLostItems.length === 0 && myNotifications.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="material-symbols-outlined text-5xl text-slate-300" style={{ fontSize: '48px' }}>inventory_2</span>
                    <p className="mt-3 text-slate-500 font-medium">暂无发布记录</p>
                    <Link to="/publish" className="inline-flex items-center gap-2 mt-4 px-5 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-blue-600 transition-colors">
                      <span className="material-symbols-outlined text-base">add</span>
                      发布内容
                    </Link>
                  </div>
                ) : (
                  <>
                    {myNotifications.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">课程通知</h4>
                        {myNotifications.map((item) => (
                          <Link
                            key={item.id}
                            to="/notifications"
                            className="flex items-center justify-between p-5 rounded-2xl bg-white/40 hover:bg-white/70 transition-all group mb-2"
                          >
                            <div className="flex items-center gap-4">
                              <div className="size-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <span className="material-symbols-outlined">notification_important</span>
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{item.title}</h4>
                                <p className="text-xs text-slate-500 font-medium">{item.course} • 发布于 {new Date(item.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                    {myActivities.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">校园活动</h4>
                        {myActivities.map((item) => (
                          <Link
                            key={item.id}
                            to="/activities"
                            className="flex items-center justify-between p-5 rounded-2xl bg-white/40 hover:bg-white/70 transition-all group mb-2"
                          >
                            <div className="flex items-center gap-4">
                              <div className="size-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <span className="material-symbols-outlined">event</span>
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{item.title}</h4>
                                <p className="text-xs text-slate-500 font-medium">{item.date} • 发布于 {new Date(item.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                    {myLostItems.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">失物招领</h4>
                        {myLostItems.map((item) => (
                          <Link
                            key={item.id}
                            to="/lost-and-found"
                            className="flex items-center justify-between p-5 rounded-2xl bg-white/40 hover:bg-white/70 transition-all group mb-2"
                          >
                            <div className="flex items-center gap-4">
                              <div className="size-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <span className="material-symbols-outlined">
                                  {item.type === 'lost' ? 'search' : 'found'}
                                </span>
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{item.title}</h4>
                                <p className="text-xs text-slate-500 font-medium">发布于 {new Date(item.created_at).toLocaleString()}</p>
                              </div>
                            </div>
                            <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest">{item.status}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Edit Profile Tab */}
            {activeTab === 'edit-profile' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">person</span>
                  编辑个人资料
                </h3>

                {/* Avatar */}
                <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
                  <div className="size-24 rounded-full border-4 border-white shadow-xl overflow-hidden bg-slate-100">
                    <img src={user.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuCUtxxC52ARabd-8SDwIbftfDI6ffT14_teLYKKqt0ptE9jATkW5nDw_NbrfEMy0oqANCqIxmTTblvFVQ-m1L2OTJm4i6rleTc0SYELXCD-ThiXcS3mjg-PIfVU4ToWOsIm-e5Ebm_la-c6TANnBdV1tu-Fc1Qt7KBZGpKL1kI20f9aJfLVcmUVb8MbSv0dXBprfi3j1sNFeGD-ud5eddnfTks1_UTxE0UvfXAsxAorLfWZoJJxEd8l32iXZ3PlWAzOUj2W7WpAZMSm"} alt={user.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">头像</p>
                    <p className="text-xs text-slate-500 mb-3">支持 JPG、PNG 格式</p>
                    <button className="px-4 py-2 rounded-xl bg-white/60 border border-white/60 text-sm font-bold text-slate-700 hover:bg-white transition-all">
                      更换头像
                    </button>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900">姓名</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900"
                      placeholder="请输入姓名"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900">学号</label>
                    <input
                      type="text"
                      value={user.studentId || ''}
                      disabled
                      className="w-full px-4 py-3 rounded-xl bg-slate-100 border border-slate-200 outline-none text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900">专业</label>
                    <input
                      type="text"
                      value={profileForm.major}
                      onChange={(e) => setProfileForm({ ...profileForm, major: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900"
                      placeholder="例如：计算机科学与技术"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900">手机号</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900"
                      placeholder="请输入手机号"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-bold text-slate-900">个人简介</label>
                    <textarea
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                      className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary text-slate-900 resize-none min-h-[100px]"
                      placeholder="介绍一下自己..."
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    onClick={handleProfileSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        保存中...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-lg">save</span>
                        保存更改
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Change Password Tab */}
            {activeTab === 'change-password' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">lock</span>
                  修改密码
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900">当前密码</label>
                    <input
                      type="password"
                      value={passwordForm.old_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900"
                      placeholder="请输入当前密码"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900">新密码</label>
                    <input
                      type="password"
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900"
                      placeholder="请输入新密码（至少6位）"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900">确认新密码</label>
                    <input
                      type="password"
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900"
                      placeholder="请再次输入新密码"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    onClick={handlePasswordChange}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        修改中...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-lg">check</span>
                        确认修改
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default Profile;
