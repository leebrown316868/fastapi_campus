import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usersService } from '../services/users.service';
import { showToast } from '../components/Toast';

type TabType = 'profile' | 'password';

const Settings: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
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

    // Validation
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
      // Error from fetch is thrown as Error object with message property
      showToast(error.message || '密码修改失败', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="w-full max-w-[800px] mx-auto px-6 py-12 flex flex-col gap-10">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">账户设置</h1>
        <p className="text-lg text-slate-600 font-medium">管理您的个人资料和账户安全。</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${
            activeTab === 'profile'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          个人资料
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${
            activeTab === 'password'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          修改密码
        </button>
      </div>

      {/* Content */}
      <div className="glass-panel rounded-[2rem] p-8">
        {activeTab === 'profile' ? (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">person</span>
              编辑个人资料
            </h3>

            {/* Avatar */}
            <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
              <div className="size-24 rounded-full border-4 border-white shadow-xl overflow-hidden bg-slate-100">
                <img
                  src={user.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuCUtxxC52ARabd-8SDwIbftfDI6ffT14_teLYKKqt0ptE9jATkW5nDw_NbrfEMy0oqANCqIxmTTblvFVQ-m1L2OTJm4i6rleTc0SYELXCD-ThiXcS3mjg-PIfVU4ToWOsIm-e5Ebm_la-c6TANnBdV1tu-Fc1Qt7KBZGpKL1kI20f9aJfLVcmUVb8MbSv0dXBprfi3j1sNFeGD-ud5eddnfTks1_UTxE0UvfXAsxAorLfWZoJJxEd8l32iXZ3PlWAzOUj2W7WpAZMSm"}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">头像</p>
                <p className="text-xs text-slate-500 mb-3">支持 JPG、PNG 格式，建议尺寸 200x200</p>
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
        ) : (
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
      </div>
    </div>
  );
};

export default Settings;
