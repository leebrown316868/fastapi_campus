import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { NAV_ITEMS } from '../constants';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0, opacity: 0, scaleX: 1 });
  const [scrollY, setScrollY] = useState(0);
  const prevIndexRef = useRef(-1);

  // Track scroll for background parallax
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sliding Nav Indicator Logic
  useEffect(() => {
    const activeIndex = NAV_ITEMS.findIndex(item =>
      location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
    );

    if (navContainerRef.current && activeIndex !== -1) {
      const activeElement = navContainerRef.current.children[activeIndex + 1] as HTMLElement;
      if (activeElement) {
        const stretchAmount = prevIndexRef.current === -1 ? 1 : 1.15;

        setSliderStyle({
          left: activeElement.offsetLeft,
          width: activeElement.offsetWidth,
          opacity: 1,
          scaleX: stretchAmount
        });

        const timer = setTimeout(() => {
          setSliderStyle(prev => ({ ...prev, scaleX: 1 }));
        }, 300);

        prevIndexRef.current = activeIndex;
        return () => clearTimeout(timer);
      }
    } else {
      setSliderStyle(prev => ({ ...prev, opacity: 0 }));
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Bubbles data
  const bubbles = [
    { size: 400, top: '10%', left: '-5%', color: 'bg-primary/10', speed: 0.05 },
    { size: 300, top: '40%', left: '85%', color: 'bg-emerald-400/10', speed: 0.08 },
    { size: 500, top: '70%', left: '10%', color: 'bg-blue-300/10', speed: 0.03 },
    { size: 250, top: '20%', left: '60%', color: 'bg-green-300/10', speed: 0.06 },
  ];

  const isAdminPage = location.pathname.startsWith('/admin');
  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Dynamic Animated Bubbles */}
      {bubbles.map((b, i) => (
        <div
          key={i}
          className={`bubble animate-float-slow ${b.color}`}
          style={{
            width: `${b.size}px`,
            height: `${b.size}px`,
            top: b.top,
            left: b.left,
            transform: `translateY(${scrollY * b.speed}px)`,
          }}
        />
      ))}

      {/* Header */}
      <nav className="sticky top-0 z-50 w-full glass-panel border-b-0 h-[80px]">
        <div className="h-full px-6 lg:px-10 flex items-center justify-between max-w-[1440px] mx-auto">
          <Link to="/" className="flex items-center gap-3 min-w-[200px]">
            <div className="size-10 rounded-xl bg-gradient-to-br from-green-400 to-primary flex items-center justify-center text-white shadow-lg">
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>school</span>
            </div>
            <h1 className="text-slate-900 text-xl font-bold leading-tight tracking-tight">校园门户</h1>
          </Link>

          <div className="hidden lg:flex items-center justify-center absolute left-1/2 -translate-x-1/2">
            <nav ref={navContainerRef} className="relative flex items-center p-1.5 rounded-full bg-white/40 border border-white/50 backdrop-blur-md shadow-sm">
              <div
                className="absolute bg-white rounded-full shadow-sm transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] z-0"
                style={{
                  left: `${sliderStyle.left}px`,
                  width: `${sliderStyle.width}px`,
                  height: 'calc(100% - 12px)',
                  top: '6px',
                  opacity: sliderStyle.opacity,
                  transform: `scaleX(${sliderStyle.scaleX})`,
                  transformOrigin: prevIndexRef.current > -1 ? 'center' : 'left'
                }}
              />
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative z-10 px-6 py-2 rounded-full text-sm font-semibold transition-colors duration-300 ${isActive ? 'text-primary' : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center justify-end gap-4 min-w-[200px]">
            <div className="hidden xl:flex items-center relative">
              <span className="material-symbols-outlined absolute left-3 text-gray-400 text-xl">search</span>
              <input
                className="h-10 pl-10 pr-4 bg-white/50 border border-white/60 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-48 focus:w-64 transition-all duration-300"
                placeholder="搜索内容..."
                type="text"
              />
            </div>
            <div className="flex gap-3 items-center">
              <button className="flex items-center justify-center rounded-full h-10 w-10 bg-white/50 text-slate-900 hover:bg-white transition-colors border border-white/60 shadow-sm">
                <span className="material-symbols-outlined text-gray-700">notifications</span>
              </button>

              {user ? (
                <div className="relative" ref={dropdownRef}>
                  <div
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="size-10 rounded-full border border-white shadow-sm overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all active:scale-95"
                  >
                    <img
                      alt="User"
                      className="w-full h-full object-cover"
                      src={user.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuCUtxxC52ARabd-8SDwIbftfDI6ffT14_teLYKKqt0ptE9jATkW5nDw_NbrfEMy0oqANCqIxmTTblvFVQ-m1L2OTJm4i6rleTc0SYELXCD-ThiXcS3mjg-PIfVU4ToWOsIm-e5Ebm_la-c6TANnBdV1tu-Fc1Qt7KBZGpKL1kI20f9aJfLVcmUVb8MbSv0dXBprfi3j1sNFeGD-ud5eddnfTks1_UTxE0UvfXAsxAorLfWZoJJxEd8l32iXZ3PlWAzOUj2W7WpAZMSm"}
                    />
                  </div>

                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-56 glass-card rounded-2xl p-2 shadow-2xl border border-white/50 animate-fade-in-up origin-top-right z-[60]">
                      <div className="p-3 border-b border-slate-100/50 mb-1">
                        <p className="text-sm font-bold text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-500 font-medium truncate">{user.email}</p>
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${user.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                            {user.role === 'admin' ? '管理员' : user.role === 'publisher' ? '发布者' : '普通用户'}
                          </span>
                        </div>
                      </div>
                      <Link to="/profile" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/5 text-slate-700 hover:text-primary transition-colors text-sm font-bold">
                        <span className="material-symbols-outlined text-lg">person</span>
                        个人中心
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber-500/5 text-slate-700 hover:text-amber-600 transition-colors text-sm font-bold">
                          <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                          管理后台
                        </Link>
                      )}
                      <div className="h-px bg-slate-100/50 my-1 mx-2" />
                      <button
                        onClick={() => logout()}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-red-50 text-slate-700 hover:text-red-600 transition-colors text-sm font-bold"
                      >
                        <span className="material-symbols-outlined text-lg">logout</span>
                        退出登录
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login" className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors">
                  <span className="material-symbols-outlined text-lg">login</span>
                  登录
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Admin-only FAB */}
      {isAdminPage && (
        <div className="fixed bottom-8 right-8 z-40">
          <Link to="/publish">
            <button className="group flex items-center justify-center w-14 h-14 bg-primary text-white rounded-full shadow-[0_8px_30px_rgb(31,104,239,0.3)] hover:shadow-[0_8px_40px_rgb(31,104,239,0.5)] hover:scale-110 transition-all duration-300">
              <span className="material-symbols-outlined text-2xl group-hover:rotate-90 transition-transform duration-300">add</span>
            </button>
          </Link>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto py-6 text-center text-slate-500 text-sm glass-panel border-t border-b-0 rounded-t-2xl mx-10 mb-0">
        <p>© 2023 校园门户方案。保留所有权利。</p>
      </footer>
    </div>
  );
};

export default Layout;