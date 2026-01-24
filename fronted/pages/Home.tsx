
import React from 'react';
import { Link } from 'react-router-dom';
import { MOCK_NEWS } from '../constants';

const Home: React.FC = () => {
  return (
    <div className="w-full max-w-[1200px] mx-auto px-6 py-8 flex flex-col gap-10">
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center gap-8 py-10 md:py-16">
        <div className="flex flex-col gap-3 max-w-2xl">
          <h1 className="text-slate-800 tracking-tight text-4xl md:text-6xl font-extrabold leading-[1.1]">
            欢迎来到<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-primary">校园生活</span>
          </h1>
          <p className="text-slate-600 text-lg md:text-xl font-medium leading-relaxed max-w-lg mx-auto">
            您的更新、活动和导航中心。今天您想找什么？
          </p>
        </div>
        <div className="w-full max-w-[640px] relative group z-10">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-primary text-2xl">search</span>
          </div>
          <input 
            className="block w-full pl-14 pr-6 py-5 text-base md:text-lg text-slate-900 placeholder:text-slate-500 bg-white/80 backdrop-blur-xl border border-white/60 rounded-full focus:ring-4 focus:ring-primary/20 focus:border-primary/30 transition-all duration-300 outline-none shadow-inner" 
            placeholder="搜索课程、社团或失物..." 
            type="text"
          />
          <div className="absolute inset-y-0 right-2 flex items-center">
            <button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full p-2.5 transition-transform hover:scale-105 shadow-md flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </section>

      {/* Quick Access Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/notifications" className="glass-card glass-card-hover rounded-2xl p-6 flex flex-col gap-4 group cursor-pointer">
          <div className="w-14 h-14 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-blue-100 shadow-sm">
            <span className="material-symbols-outlined text-3xl">menu_book</span>
          </div>
          <div>
            <h3 className="text-slate-900 text-xl font-bold mb-1">课程通知</h3>
            <p className="text-slate-500 text-sm leading-relaxed">来自教授关于作业的3条更新。</p>
          </div>
          <div className="mt-auto flex items-center text-primary font-bold text-sm">
            <span>查看更新</span>
            <span className="material-symbols-outlined text-sm ml-1 transition-transform group-hover:translate-x-1">arrow_forward</span>
          </div>
        </Link>

        <Link to="/activities" className="glass-card glass-card-hover rounded-2xl p-6 flex flex-col gap-4 group cursor-pointer">
          <div className="w-14 h-14 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-emerald-100 shadow-sm">
            <span className="material-symbols-outlined text-3xl">campaign</span>
          </div>
          <div>
            <h3 className="text-slate-900 text-xl font-bold mb-1">活动公告</h3>
            <p className="text-slate-500 text-sm leading-relaxed">别错过明天在大礼堂举行的科学博览会。</p>
          </div>
          <div className="mt-auto flex items-center text-emerald-600 font-bold text-sm">
            <span>探索活动</span>
            <span className="material-symbols-outlined text-sm ml-1 transition-transform group-hover:translate-x-1">arrow_forward</span>
          </div>
        </Link>

        <Link to="/lost-and-found" className="glass-card glass-card-hover rounded-2xl p-6 flex flex-col gap-4 group cursor-pointer">
          <div className="w-14 h-14 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-amber-100 shadow-sm">
            <span className="material-symbols-outlined text-3xl">search</span>
          </div>
          <div>
            <h3 className="text-slate-900 text-xl font-bold mb-1">失物招领</h3>
            <p className="text-slate-500 text-sm leading-relaxed">浏览最近捡到的物品或报告丢失物品。</p>
          </div>
          <div className="mt-auto flex items-center text-amber-600 font-bold text-sm">
            <span>查看物品</span>
            <span className="material-symbols-outlined text-sm ml-1 transition-transform group-hover:translate-x-1">arrow_forward</span>
          </div>
        </Link>
      </section>

      {/* Latest Dynamics */}
      <section className="flex flex-col gap-6 pt-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-slate-900 text-2xl font-bold tracking-tight">最新动态</h2>
          <button className="text-sm font-semibold text-primary hover:text-blue-700 flex items-center gap-1">
            查看全部 <span className="material-symbols-outlined text-base">chevron_right</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {MOCK_NEWS.map((item) => (
            <article key={item.id} className="glass-card rounded-xl p-5 hover:bg-white/80 transition-colors shadow-sm border border-white/60">
              <div className="flex items-start justify-between mb-3">
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${item.tagColor}`}>
                  {item.tag}
                </span>
                <span className="text-slate-400 text-xs font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">schedule</span> {item.time}
                </span>
              </div>
              <h3 className="text-slate-900 font-bold text-lg mb-2 leading-snug">{item.title}</h3>
              <p className="text-slate-600 text-sm mb-4 line-clamp-2">{item.description}</p>
              <div className="flex items-center gap-2 mt-auto pt-3 border-t border-slate-100/50">
                <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden">
                  <img alt={item.author.name} className="w-full h-full object-cover" src={item.author.avatar} />
                </div>
                <span className="text-slate-500 text-xs font-medium">发布者：{item.author.name}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
