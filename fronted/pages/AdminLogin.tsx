import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DottedBackground from '../components/DottedBackground';

const AdminLogin: React.FC = () => {
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
            await login(formData.username, formData.password, true);
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
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-400/10 rounded-full -ml-12 -mb-12 blur-2xl"></div>

                {/* Admin Logo */}
                <div className="flex flex-col items-center mb-10 text-center relative z-10">
                    <div className="size-16 rounded-[1.25rem] bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-xl mb-4">
                        <span className="material-symbols-outlined text-[32px]">admin_panel_settings</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">管理后台</h1>
                    <p className="text-slate-500 font-medium mt-1">仅限授权管理员访问</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6 relative z-10">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">管 理员账号</label>
                        <div className="relative group">
                            <span className="material-symbols-outlined absolute left-4 top-3 text-slate-400 text-xl group-focus-within:text-amber-500 transition-colors">shield_lock</span>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="w-full pl-12 pr-5 py-3.5 rounded-2xl bg-white/40 border border-slate-200 focus:border-amber-500/50 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-semibold text-slate-900 placeholder-slate-400"
                                placeholder="admin@campus.edu"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">密 码</label>
                        <div className="relative group">
                            <span className="material-symbols-outlined absolute left-4 top-3 text-slate-400 text-xl group-focus-within:text-amber-500 transition-colors">lock</span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-white/40 border border-slate-200 focus:border-amber-500/50 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-semibold text-slate-900"
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

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:-translate-y-0.5 transform active:scale-[0.98] transition-all flex items-center justify-center gap-3 overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    >
                        {isLoading ? (
                            <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <span>进入管理后台</span>
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                    <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="text-sm text-slate-400 hover:text-primary font-semibold transition-colors"
                    >
                        ← 返回用户登录
                    </button>
                </div>
            </div>
            </div>
        </div>
    );
};

export default AdminLogin;
