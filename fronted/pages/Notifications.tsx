
import React, { useEffect, useState } from 'react';
import { notificationsService, Notification as ApiNotification } from '../services/notifications.service';
import { showToast } from '../components/Toast';

// Transform API notification to match UI expectations
const transformNotification = (api: ApiNotification) => ({
  ...api,
  isImportant: api.is_important,
});

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setIsLoading(true);
        const data = await notificationsService.getAll();
        setNotifications(data.map(transformNotification));
      } catch (error) {
        showToast('加载通知失败', 'error');
        console.error('Failed to fetch notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, []);
  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar Filters */}
      <aside className="hidden lg:flex w-80 flex-col gap-6 border-r border-white/40 bg-white/40 backdrop-blur-lg p-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">通知筛选</h3>
          <button className="text-sm font-medium text-primary hover:text-primary/80">重置</button>
        </div>
        
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">搜索关键词</label>
          <div className="relative">
            <input 
              className="w-full rounded-xl px-4 py-3 text-sm placeholder:text-slate-500 shadow-sm bg-white/50 border border-white/60 focus:bg-white/90 outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
              placeholder="输入课程名或教师名..." 
              type="text"
            />
            <span className="material-symbols-outlined absolute right-3 top-3 text-slate-400" style={{ fontSize: '20px' }}>manage_search</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">所属课程</label>
          <div className="relative">
            <select className="w-full appearance-none rounded-xl px-4 py-3 text-sm text-slate-700 shadow-sm bg-white/50 border border-white/60 outline-none focus:bg-white/90 cursor-pointer">
              <option>所有正在学习的课程</option>
              <option>CS 101: 计算机科学导论</option>
              <option>ART 204: 现代设计</option>
              <option>HIST 300: 世界历史</option>
              <option>PHYS 101: 普通物理</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-slate-500">expand_more</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">发布日期</label>
          <div className="flex items-center gap-2">
            <button className="flex-1 rounded-xl py-2 text-sm text-slate-600 bg-white/50 border border-white/60 hover:bg-white/80">最近7天</button>
            <button className="flex-1 rounded-xl py-2 text-sm text-slate-600 bg-white/50 border border-white/60 hover:bg-white/80">本月</button>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between rounded-xl bg-white/30 p-4 border border-white/40">
          <span className="text-sm font-medium text-slate-800">仅看未读消息</span>
          <label className="relative inline-flex cursor-pointer items-center">
            <input className="peer sr-only" type="checkbox" />
            <div className="peer h-6 w-11 rounded-full bg-slate-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
          </label>
        </div>

        <button className="mt-auto w-full rounded-xl bg-primary py-4 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-transform active:scale-95 hover:bg-blue-600">
          应用筛选条件
        </button>
      </aside>

      {/* Main List */}
      <main className="flex-1 overflow-y-auto px-6 py-8 md:px-12 lg:px-16 scroll-smooth">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight drop-shadow-sm">最近课程更新</h1>
              <p className="mt-2 text-slate-600 font-medium">查看来自您选修课程的最新教学通知与提醒。</p>
            </div>
            <button className="group flex items-center gap-2 rounded-xl bg-white/40 px-5 py-2.5 text-sm font-semibold text-slate-800 transition-all hover:bg-white/70 hover:shadow-md border border-white/50 backdrop-blur-sm">
              <span className="material-symbols-outlined text-slate-600 group-hover:text-primary transition-colors" style={{ fontSize: '20px' }}>mark_chat_read</span>
              全部标记为已读
            </button>
          </div>

          {isLoading ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
              <p className="mt-4 text-lg font-medium text-slate-500">加载中...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <span className="material-symbols-outlined text-6xl text-slate-300" style={{ fontSize: '64px' }}>notifications_none</span>
              <p className="mt-4 text-lg font-medium text-slate-500">暂无通知</p>
            </div>
          ) : (
            <div className="grid gap-5 pb-12">
              {notifications.map((item) => (
              <div key={item.id} className="glass-card relative flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-start group/card cursor-pointer hover:bg-white/90">
                {item.isImportant && (
                  <div className="absolute left-0 top-6 h-12 w-1.5 rounded-r-lg bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                )}
                <div className="flex w-full flex-col gap-3 pl-3">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{item.course}</span>
                        {item.isImportant && (
                          <span className="bg-red-500/10 text-red-600 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide border border-red-500/20">
                            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>priority_high</span> 重要
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1 text-xl font-bold text-slate-900 group-hover/card:text-primary transition-colors">{item.title}</h3>
                    </div>
                    <span className="text-xs font-medium text-slate-500 bg-white/50 px-2 py-1 rounded-lg">{item.time}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600">{item.content}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-4 border-t border-slate-200/50 pt-4 sm:gap-8">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-cover bg-center ring-2 ring-white" style={{ backgroundImage: `url(${item.avatar})` }}></div>
                      <span className="text-sm font-semibold text-slate-700">{item.author}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '18px' }}>location_on</span>
                      <span className="text-sm font-medium">{item.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            </div>
          )}

          <div className="flex justify-center pb-12">
            <button className="flex items-center gap-2 rounded-full bg-white/30 px-8 py-3.5 text-sm font-bold text-slate-800 backdrop-blur-md transition-all hover:bg-white/50 hover:shadow-lg hover:-translate-y-1 border border-white/40">
              加载更多历史通知
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>history</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Notifications;
