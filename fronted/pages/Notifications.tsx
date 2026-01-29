
import React, { useEffect, useState } from 'react';
import { notificationsService, Notification as ApiNotification } from '../services/notifications.service';
import { showToast } from '../components/Toast';
import DottedBackground from '../components/DottedBackground';

// Transform API notification to match UI expectations
const transformNotification = (api: ApiNotification) => ({
  ...api,
  isImportant: api.is_important,
});

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [importantFilter, setImportantFilter] = useState<'all' | 'important'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

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

  // Filter notifications by importance
  const filteredNotifications = notifications.filter(notification => {
    if (importantFilter === 'important') return notification.isImportant;
    return true;
  });
  return (
    <div className="relative min-h-screen">
      {/* Dynamic Dotted Background */}
      <DottedBackground />

      <div className={`relative z-10 w-full max-w-[1200px] mx-auto px-6 py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">课程通知</h1>
            <p className="text-lg text-slate-600 mt-1">查看来自您选修课程的最新教学通知与提醒。</p>
          </div>
          <button className="group flex items-center gap-2 rounded-xl bg-white/40 px-5 py-2.5 text-sm font-semibold text-slate-800 transition-all hover:bg-white/70 hover:shadow-md border border-white/50 backdrop-blur-sm">
            <span className="material-symbols-outlined text-slate-600 group-hover:text-primary transition-colors" style={{ fontSize: '20px' }}>mark_chat_read</span>
            全部标记为已读
          </button>
        </div>

        {/* Filters */}
        <div className="glass-card rounded-2xl p-4 mb-8 flex flex-col gap-4">
          {/* Importance Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-600">筛选：</span>
            <button
              onClick={() => setImportantFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${importantFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white/60 text-slate-600 hover:bg-white/80'
                }`}
            >
              全部通知 ({notifications.length})
            </button>
            <button
              onClick={() => setImportantFilter('important')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${importantFilter === 'important'
                  ? 'bg-red-500 text-white'
                  : 'bg-white/60 text-slate-600 hover:bg-white/80'
                }`}
            >
              仅看重要 ({notifications.filter(n => n.isImportant).length})
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6 text-sm font-bold text-slate-500">
          {isLoading ? '加载中...' : `找到 ${filteredNotifications.length} 条通知`}
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 text-lg font-medium text-slate-500">加载中...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <span className="material-symbols-outlined text-6xl text-slate-300" style={{ fontSize: '64px' }}>notifications_none</span>
            <p className="mt-4 text-lg font-medium text-slate-500">暂无通知</p>
          </div>
        ) : (
          <div className="grid gap-5 pb-12">
            {filteredNotifications.map((item) => (
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
      </div>
    </div>
  );
};

export default Notifications;
