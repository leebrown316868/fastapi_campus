import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { lostItemsService } from '../services/lostItems.service';
import { showToast } from '../components/Toast';

const ItemDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    const fetchItem = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        const data = await lostItemsService.getById(parseInt(id));
        setItem(data);
      } catch (error) {
        console.error('Failed to fetch item:', error);
        showToast('加载物品信息失败', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchItem();
  }, [id]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="glass-card rounded-3xl p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-300" style={{ fontSize: '64px' }}>search_off</span>
          <h2 className="mt-4 text-xl font-bold text-slate-900">物品未找到</h2>
          <p className="mt-2 text-slate-500">该物品可能已被删除或不存在</p>
          <Link
            to="/lost-and-found"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl bg-primary text-white font-bold hover:bg-blue-600 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            返回失物招领
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Navigation & Back */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
          <Link to="/home" className="hover:text-primary hover:underline decoration-primary/30 underline-offset-4">首页</Link>
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
              {item.images && item.images.length > 0 ? (
                <>
                  <div
                    className="h-full w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    style={{ backgroundImage: `url(${item.images[activeImg]})` }}
                  ></div>
                  {/* Thumbnail Bar */}
                  {item.images.length > 1 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2 p-2 rounded-2xl bg-black/20 backdrop-blur-md border border-white/10">
                      {item.images.map((img: string, idx: number) => (
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
                  )}
                </>
              ) : (
                <div className="h-full w-full bg-slate-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-6xl text-slate-300">image_not_supported</span>
                </div>
              )}
              <div className="absolute top-4 left-4 z-20">
                <span className={`px-4 py-1.5 rounded-full backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider shadow-lg border ${
                  item.type === 'lost'
                    ? 'bg-red-500/90 border-red-400'
                    : 'bg-emerald-500/90 border-emerald-400'
                }`}>
                  {item.type === 'lost' ? '遗失' : '招领'}
                </span>
              </div>
            </div>
          </div>

          {/* Info Side */}
          <div className="w-full lg:w-1/2 p-8 lg:p-10 flex flex-col justify-center">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">{item.category}</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-medium text-slate-500">
                  {new Date(item.created_at).toLocaleString('zh-CN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight mb-4">
                {item.title}
              </h1>
              <div className="flex flex-wrap gap-3">
                {item.tags && item.tags.map((tag: string) => (
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
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">时间</p>
                  <p className="text-slate-900 font-semibold leading-snug">{item.time}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/40 transition-colors">
                <div className="size-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <span className="material-symbols-outlined">location_on</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">地点</p>
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
              <button className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-3.5 text-white shadow-lg hover:-translate-y-0.5 transition-all duration-200 w-full">
                <div className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">mail</span>
                  <span className="font-bold tracking-wide">
                    {item.type === 'lost' ? '联系发布者' : '认领物品'}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetail;
