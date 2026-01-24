
import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MOCK_LOST_ITEMS } from '../constants';

const ItemDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const item = MOCK_LOST_ITEMS.find(i => i.id === id);
  const [activeImg, setActiveImg] = useState(0);

  if (!item) return <div className="p-20 text-center">物品未找到</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Navigation & Back */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
          <Link to="/" className="hover:text-primary hover:underline decoration-primary/30 underline-offset-4">首页</Link>
          <span className="material-symbols-outlined text-xs text-slate-400">chevron_right</span>
          <Link to="/lost-and-found" className="hover:text-primary hover:underline decoration-primary/30 underline-offset-4">失物招领</Link>
          <span className="material-symbols-outlined text-xs text-slate-400">chevron_right</span>
          <span className="text-slate-900 font-bold">物品详情</span>
        </div>
        <button 
          onClick={() => navigate(-1)}
          className="group flex w-fit cursor-pointer items-center justify-center rounded-full h-10 px-5 bg-white/40 hover:bg-white/80 border border-white/50 shadow-sm transition-all duration-300 text-slate-800 text-sm font-bold gap-2"
        >
          <span className="material-symbols-outlined text-lg transition-transform group-hover:-translate-x-1">arrow_back</span>
          <span>返回搜索</span>
        </button>
      </div>

      <div className="glass-card rounded-3xl overflow-hidden p-1 shadow-2xl">
        <div className="flex flex-col lg:flex-row h-full">
          {/* Gallery Side */}
          <div className="relative w-full lg:w-1/2 min-h-[400px] lg:min-h-[600px] p-2">
            <div className="h-full w-full rounded-2xl overflow-hidden relative group">
              <div className="absolute inset-0 bg-slate-900/5 group-hover:bg-transparent transition-colors z-10"></div>
              <div 
                className="h-full w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105" 
                style={{ backgroundImage: `url(${item.images[activeImg]})` }}
              ></div>
              <div className="absolute top-4 left-4 z-20">
                <span className="px-4 py-1.5 rounded-full bg-red-500/90 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider shadow-lg border border-red-400">
                  {item.type === 'lost' ? '遗失' : '招领'}
                </span>
              </div>
              
              {/* Thumbnail Bar */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2 p-2 rounded-2xl bg-black/20 backdrop-blur-md border border-white/10">
                {item.images.map((img, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setActiveImg(idx)}
                    className={`size-12 rounded-lg bg-cover bg-center border-2 cursor-pointer shadow-lg transition-all ${
                      activeImg === idx ? 'border-white scale-110' : 'border-white/30 opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundImage: `url(${img})` }}
                  ></div>
                ))}
              </div>
            </div>
          </div>

          {/* Info Side */}
          <div className="w-full lg:w-1/2 p-8 lg:p-10 flex flex-col justify-center">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">{item.category}</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-medium text-slate-500">2小时前发布</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight mb-4">
                {item.title}
              </h1>
              <div className="flex flex-wrap gap-3">
                {item.tags.map(tag => (
                  <div key={tag} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/60 border border-white/40 shadow-sm">
                    <span className="text-sm font-semibold text-slate-700">{tag}</span>
                  </div>
                ))}
              </div>
            </div>

            <hr className="border-t border-slate-200/60 mb-8 w-full" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-4 mb-8">
              <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/40 transition-colors">
                <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <span className="material-symbols-outlined">calendar_clock</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">遗失时间</p>
                  <p className="text-slate-900 font-semibold leading-snug">{item.time}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/40 transition-colors">
                <div className="size-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <span className="material-symbols-outlined">location_on</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">最后发现地点</p>
                  <p className="text-slate-900 font-semibold leading-snug">{item.location}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/40 rounded-xl p-5 border border-white/40 mb-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary/40"></div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">info</span>
                物品描述
              </h3>
              <p className="text-slate-700 leading-relaxed">{item.description}</p>
            </div>

            <div className="mt-auto">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50 p-4 rounded-2xl border border-white/50 shadow-sm backdrop-blur-sm">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative">
                    <div className="size-12 bg-cover bg-center rounded-full border-2 border-white shadow-sm" style={{ backgroundImage: `url(${item.publisher.avatar})` }}></div>
                    <div className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">发布者</p>
                    <p className="text-base font-bold text-slate-900">{item.publisher.name}</p>
                  </div>
                </div>
                <button className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-3.5 text-white shadow-lg hover:-translate-y-0.5 transition-all duration-200 w-full sm:w-auto">
                  <div className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">mail</span>
                    <span className="font-bold tracking-wide">联系失主</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetail;
