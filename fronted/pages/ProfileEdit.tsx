
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../components/Toast';

const ProfileEdit: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Mock user extended data - will be replaced with API
  const [formData, setFormData] = useState({
    name: user?.name || '',
    major: '计算机科学与技术',
    bio: '大三在读，喜欢摄影和编程。',
    email: user?.email || '',
    phone: '138****0000',
    studentId: user?.studentId || user?.id || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // TODO: Replace with actual API call
    // await api.updateProfile(formData);

    setTimeout(() => {
      setIsLoading(false);
      showToast('资料保存成功！', 'success');
      navigate('/profile');
    }, 1000);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="glass-card rounded-2xl p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-300" style={{ fontSize: '64px' }}>account_circle</span>
          <p className="mt-4 text-lg font-medium text-slate-500">请先登录</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[900px] mx-auto px-6 py-12 flex flex-col gap-8">
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => navigate(-1)}
          className="size-10 rounded-xl bg-white/60 border border-white/60 shadow-sm flex items-center justify-center text-slate-600 hover:bg-white transition-all"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">编辑资料</h1>
          <p className="text-sm text-slate-500 font-medium">更新您的公开信息，让校友更好地了解您。</p>
        </div>
      </div>

      <div className="glass-panel p-8 md:p-12 rounded-[2.5rem] shadow-xl">
        {/* Avatar Section */}
        <div className="flex flex-col items-center mb-12">
          <div className="relative group">
            <div className="size-32 rounded-full border-4 border-white shadow-2xl overflow-hidden relative">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCUtxxC52ARabd-8SDwIbftfDI6ffT14_teLYKKqt0ptE9jATkW5nDw_NbrfEMy0oqANCqIxmTTblvFVQ-m1L2OTJm4i6rleTc0SYELXCD-ThiXcS3mjg-PIfVU4ToWOsIm-e5Ebm_la-c6TANnBdV1tu-Fc1Qt7KBZGpKL1kI20f9aJfLVcmUVb8MbSv0dXBprfi3j1sNFeGD-ud5eddnfTks1_UTxE0UvfXAsxAorLfWZoJJxEd8l32iXZ3PlWAzOUj2W7WpAZMSm"
                alt="Avatar Preview"
                className="w-full h-full object-cover group-hover:opacity-50 transition-opacity"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-black/20">
                <span className="material-symbols-outlined text-white text-3xl">add_a_photo</span>
              </div>
            </div>
            <button className="absolute -bottom-1 -right-1 size-9 rounded-full bg-primary text-white shadow-lg border-2 border-white flex items-center justify-center hover:bg-blue-600 transition-colors">
              <span className="material-symbols-outlined text-base">photo_camera</span>
            </button>
          </div>
          <p className="mt-4 text-xs font-bold text-primary uppercase tracking-widest cursor-pointer hover:underline">更换头像</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Name and Major */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-900 px-1">真实姓名</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                className="w-full px-5 py-3 rounded-2xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-slate-900"
                placeholder="请输入您的姓名"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-900 px-1">所属专业</label>
              <select
                value={formData.major}
                onChange={(e) => setFormData({...formData, major: e.target.value})}
                className="w-full px-5 py-3 rounded-2xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-slate-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[right_1rem_center] bg-no-repeat cursor-pointer"
              >
                <option>计算机科学与技术</option>
                <option>电子工程</option>
                <option>软件工程</option>
                <option>设计艺术学</option>
                <option>经济管理</option>
                <option>文学与新闻</option>
              </select>
            </div>
          </div>

          {/* Student ID - Read Only */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-900 px-1">学号</label>
            <input
              type="text"
              value={formData.studentId}
              disabled
              className="w-full px-5 py-3 rounded-2xl bg-slate-100/50 border border-slate-200 text-slate-500 font-medium cursor-not-allowed"
            />
            <p className="text-xs text-slate-400 px-1">学号不可修改，如需帮助请联系管理员</p>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-900 px-1">个人简介</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({...formData, bio: e.target.value})}
              rows={4}
              maxLength={200}
              className="w-full px-5 py-3 rounded-2xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-slate-900 resize-none"
              placeholder="介绍一下你自己..."
            />
            <p className="text-xs text-slate-400 px-1 text-right">{formData.bio.length}/200</p>
          </div>

          {/* Email - Read Only */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-900 px-1">联系邮箱</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-3.5 text-slate-400 text-xl">mail</span>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full pl-12 pr-5 py-3 rounded-2xl bg-slate-100/50 border border-slate-200 text-slate-500 font-medium cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-slate-400 px-1">邮箱为登录账号，不可修改</p>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-900 px-1">手机号码</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-3.5 text-slate-400 text-xl">smartphone</span>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                pattern="[0-9]{11}"
                className="w-full pl-12 pr-5 py-3 rounded-2xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-slate-900"
                placeholder="请输入11位手机号"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-8 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={isLoading}
              className="w-full sm:w-auto px-8 py-3 rounded-2xl text-slate-600 font-bold hover:bg-black/5 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-10 py-3 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                  保存中...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">save</span>
                  保存修改
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEdit;
