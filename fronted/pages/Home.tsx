import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MOCK_NEWS } from '../constants';
import DottedBackground from '../components/DottedBackground';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections(prev => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('[data-animate]').forEach(el => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Dynamic Dotted Background */}
      <DottedBackground />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6 py-8 flex flex-col gap-10">
        {/* Hero Section */}
        <section
          id="hero"
          data-animate
          className={`flex flex-col items-center text-center gap-8 py-10 md:py-16 transition-all duration-1000 ${
            visibleSections.has('hero') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="flex flex-col gap-3 max-w-2xl">
            <h1 className="text-slate-800 tracking-tight text-4xl md:text-6xl font-extrabold leading-[1.1]">
              欢迎来到
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-primary animate-gradient-x">
                校园生活
              </span>
            </h1>
            <p className="text-slate-600 text-lg md:text-xl font-medium leading-relaxed max-w-lg mx-auto">
              您的更新、活动和导航中心。今天您想找什么？
            </p>
          </div>
          <form onSubmit={handleSearch} className="w-full max-w-[640px] relative z-10">
            {/* Search glow effect */}
            <div className={`absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400/20 via-primary/20 to-blue-400/20 blur-xl transition-opacity duration-500 ${
              isSearchFocused ? 'opacity-100 scale-105' : 'opacity-0 scale-95'
            }`}></div>

            <div className={`relative rounded-full transition-all duration-500 ${
              isSearchFocused ? 'shadow-[0_0_40px_rgba(16,185,129,0.3),0_0_80px_rgba(59,130,246,0.2)]' : 'shadow-lg'
            }`}>
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-primary text-2xl animate-pulse">search</span>
              </div>
              <input
                className="block w-full pl-14 pr-6 py-5 text-base md:text-lg text-slate-900 placeholder:text-slate-500 bg-white/80 backdrop-blur-xl border border-white/60 rounded-full focus:ring-4 focus:ring-primary/20 focus:border-primary/30 transition-all duration-300 outline-none"
                placeholder="搜索课程、社团或失物..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
              <div className="absolute inset-y-0 right-2 flex items-center">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-full p-2.5 transition-all duration-300 hover:scale-110 hover:rotate-45 shadow-lg hover:shadow-xl flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </form>

          {/* Floating badges */}
          <div className="flex flex-wrap gap-3 justify-center mt-4">
            {[
              { label: '📚 课程', type: 'notifications' },
              { label: '🎉 活动', type: 'activities' },
              { label: '🔍 失物', type: 'lost-and-found' }
            ].map((badge, i) => (
              <Link
                key={badge.label}
                to={`/${badge.type}`}
                className="px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full text-sm font-medium text-slate-700 shadow-sm hover:shadow-md hover:bg-white/80 transition-all duration-300 hover:scale-105 cursor-pointer animate-float"
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                {badge.label}
              </Link>
            ))}
          </div>
        </section>

        {/* Quick Access Cards */}
        <section
          id="cards"
          data-animate
          className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-1000 delay-200 ${
            visibleSections.has('cards') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <Link
            to="/notifications"
            className="group relative bg-white/70 backdrop-blur-xl rounded-2xl p-6 flex flex-col gap-4 cursor-pointer overflow-hidden transition-all duration-500 hover:bg-white/90 hover:-translate-y-2 hover:shadow-2xl border border-white/60"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 border border-blue-100 shadow-sm">
                <span className="material-symbols-outlined text-3xl group-hover:animate-bounce">menu_book</span>
              </div>
            </div>
            <div className="relative">
              <h3 className="text-slate-900 text-xl font-bold mb-1 group-hover:text-blue-600 transition-colors">课程通知</h3>
              <p className="text-slate-500 text-sm leading-relaxed">来自教授关于作业的3条更新。</p>
            </div>
            <div className="mt-auto flex items-center text-primary font-bold text-sm relative">
              <span className="group-hover:translate-x-1 transition-transform">查看更新</span>
              <span className="material-symbols-outlined text-sm ml-1 transition-all group-hover:translate-x-2">arrow_forward</span>
            </div>
          </Link>

          <Link
            to="/activities"
            className="group relative bg-white/70 backdrop-blur-xl rounded-2xl p-6 flex flex-col gap-4 cursor-pointer overflow-hidden transition-all duration-500 hover:bg-white/90 hover:-translate-y-2 hover:shadow-2xl border border-white/60"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 border border-emerald-100 shadow-sm">
                <span className="material-symbols-outlined text-3xl group-hover:animate-bounce">campaign</span>
              </div>
            </div>
            <div className="relative">
              <h3 className="text-slate-900 text-xl font-bold mb-1 group-hover:text-emerald-600 transition-colors">活动公告</h3>
              <p className="text-slate-500 text-sm leading-relaxed">别错过明天在大礼堂举行的科学博览会。</p>
            </div>
            <div className="mt-auto flex items-center text-emerald-600 font-bold text-sm relative">
              <span className="group-hover:translate-x-1 transition-transform">探索活动</span>
              <span className="material-symbols-outlined text-sm ml-1 transition-all group-hover:translate-x-2">arrow_forward</span>
            </div>
          </Link>

          <Link
            to="/lost-and-found"
            className="group relative bg-white/70 backdrop-blur-xl rounded-2xl p-6 flex flex-col gap-4 cursor-pointer overflow-hidden transition-all duration-500 hover:bg-white/90 hover:-translate-y-2 hover:shadow-2xl border border-white/60"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 border border-amber-100 shadow-sm">
                <span className="material-symbols-outlined text-3xl group-hover:animate-bounce">search</span>
              </div>
            </div>
            <div className="relative">
              <h3 className="text-slate-900 text-xl font-bold mb-1 group-hover:text-amber-600 transition-colors">失物招领</h3>
              <p className="text-slate-500 text-sm leading-relaxed">浏览最近捡到的物品或报告丢失物品。</p>
            </div>
            <div className="mt-auto flex items-center text-amber-600 font-bold text-sm relative">
              <span className="group-hover:translate-x-1 transition-transform">查看物品</span>
              <span className="material-symbols-outlined text-sm ml-1 transition-all group-hover:translate-x-2">arrow_forward</span>
            </div>
          </Link>
        </section>

        {/* Latest Dynamics */}
        <section
          id="news"
          data-animate
          className={`flex flex-col gap-6 pt-6 transition-all duration-1000 delay-400 ${
            visibleSections.has('news') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="flex items-center justify-between px-2">
            <h2 className="text-slate-900 text-2xl font-bold tracking-tight">最新动态</h2>
            <button className="text-sm font-semibold text-primary hover:text-blue-700 flex items-center gap-1 hover:gap-2 transition-all">
              查看全部 <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {MOCK_NEWS.map((item, index) => (
              <article
                key={item.id}
                className="group relative bg-white/70 backdrop-blur-xl rounded-xl p-5 overflow-hidden transition-all duration-500 hover:bg-white/90 hover:-translate-y-1 hover:shadow-xl border border-white/60"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${item.tagColor} group-hover:scale-105 transition-transform`}
                    >
                      {item.tag}
                    </span>
                    <span className="text-slate-400 text-xs font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">schedule</span> {item.time}
                    </span>
                  </div>
                  <h3 className="text-slate-900 font-bold text-lg mb-2 leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-slate-600 text-sm mb-4 line-clamp-2 group-hover:text-slate-700 transition-colors">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-2 mt-auto pt-3 border-t border-slate-100/50">
                    <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden group-hover:scale-110 transition-transform">
                      <img alt={item.author.name} className="w-full h-full object-cover" src={item.author.avatar} />
                    </div>
                    <span className="text-slate-500 text-xs font-medium group-hover:text-slate-700 transition-colors">
                      发布者：{item.author.name}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <style>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Home;
