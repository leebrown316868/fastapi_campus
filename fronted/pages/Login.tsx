import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DottedBackground from '../components/DottedBackground';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username.trim()) {
      return;
    }
    if (!formData.password) {
      return;
    }

    try {
      await login(formData.username, formData.password, false);
    } catch {
      // Error already handled in AuthContext
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center px-6">
      {/* Dynamic Dotted Background */}
      <DottedBackground />

      <div className={`relative z-10 w-full max-w-[440px] transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      <div className="glass-card w-full rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
        {/* Design Accents */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-400/10 rounded-full -ml-12 -mb-12 blur-2xl"></div>

        <div className="flex flex-col items-center mb-10 text-center relative z-10">
          <div className="size-16 rounded-[1.25rem] bg-gradient-to-br from-green-400 to-primary flex items-center justify-center text-white shadow-xl mb-4">
            <span className="material-symbols-outlined text-[32px]">school</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">欢迎回来</h1>
          <p className="text-slate-500 font-medium mt-1">登录您的校园门户账户</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">学 号 / 邮箱</label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-3 text-slate-400 text-xl group-focus-within:text-primary transition-colors">person</span>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full pl-12 pr-5 py-3.5 rounded-2xl bg-white/40 border border-slate-200 focus:border-primary/50 outline-none focus:ring-4 focus:ring-primary/10 transition-all font-semibold text-slate-900 placeholder-slate-400"
                placeholder="student@campus.edu"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">密 码</label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-3 text-slate-400 text-xl group-focus-within:text-primary transition-colors">lock</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-white/40 border border-slate-200 focus:border-primary/50 outline-none focus:ring-4 focus:ring-primary/10 transition-all font-semibold text-slate-900"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          <div className="flex justify-end px-1">
            <button type="button" className="text-xs font-bold text-primary hover:underline underline-offset-4">忘记密码？</button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-2xl bg-primary text-white font-black shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 transform active:scale-[0.98] transition-all flex items-center justify-center gap-3 overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {isLoading ? (
              <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <span>登录账户</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </>
            )}
          </button>
        </form>
      </div>
      </div>
    </div>
  );
};

export default Login;
