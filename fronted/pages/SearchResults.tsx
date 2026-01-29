import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { notificationsService } from '../services/notifications.service';
import { activitiesService } from '../services/activities.service';
import { lostItemsService } from '../services/lostItems.service';
import { showToast } from '../components/Toast';
import DottedBackground from '../components/DottedBackground';

type TabType = 'all' | 'notifications' | 'activities' | 'lost-found';

const SearchResults: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [results, setResults] = useState({
    notifications: [] as any[],
    activities: [] as any[],
    lostItems: [] as any[],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  useEffect(() => {
    const searchAll = async () => {
      if (!query.trim()) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Search in all three sources
        const [notificationsData, activitiesData, lostItemsData] = await Promise.all([
          notificationsService.getAll(),
          activitiesService.getAll(),
          lostItemsService.getAll(),
        ]);

        // Filter results based on query
        const searchLower = query.toLowerCase();

        const filteredNotifications = notificationsData.filter(item =>
          item.title.toLowerCase().includes(searchLower) ||
          item.content.toLowerCase().includes(searchLower) ||
          item.course.toLowerCase().includes(searchLower)
        );

        const filteredActivities = activitiesData.filter(item =>
          item.title.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower) ||
          item.category.toLowerCase().includes(searchLower) ||
          item.location.toLowerCase().includes(searchLower)
        );

        const filteredLostItems = lostItemsData.filter(item =>
          item.title.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower) ||
          item.category.toLowerCase().includes(searchLower) ||
          item.location.toLowerCase().includes(searchLower)
        );

        setResults({
          notifications: filteredNotifications,
          activities: filteredActivities,
          lostItems: filteredLostItems,
        });
      } catch (error) {
        showToast('搜索失败', 'error');
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    searchAll();
  }, [query]);

  const getTotalCount = () => {
    if (activeTab === 'all') {
      return results.notifications.length + results.activities.length + results.lostItems.length;
    }
    return results[activeTab]?.length || 0;
  };

  return (
    <div className="relative min-h-screen">
      {/* Dynamic Dotted Background */}
      <DottedBackground />

      <div className={`relative z-10 w-full max-w-[1200px] mx-auto px-6 py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Link to="/" className="text-slate-500 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <h1 className="text-3xl font-bold text-slate-900">
              {query ? `"${query}" 的搜索结果` : '搜索'}
            </h1>
          </div>

          {/* Search Input */}
          <div className="relative max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-slate-400">search</span>
            </div>
            <input
              type="text"
              defaultValue={query}
              placeholder="搜索通知、活动或失物..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/70 backdrop-blur-sm border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  window.location.href = `/search?q=${encodeURIComponent(e.currentTarget.value.trim())}`;
                }
              }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'bg-white/60 text-slate-600 hover:bg-white/80'
            }`}
          >
            全部 ({getTotalCount()})
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'bg-white/60 text-slate-600 hover:bg-white/80'
            }`}
          >
            课程通知 ({results.notifications.length})
          </button>
          <button
            onClick={() => setActiveTab('activities')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'activities'
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'bg-white/60 text-slate-600 hover:bg-white/80'
            }`}
          >
            活动公告 ({results.activities.length})
          </button>
          <button
            onClick={() => setActiveTab('lost-found')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'lost-found'
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'bg-white/60 text-slate-600 hover:bg-white/80'
            }`}
          >
            失物招领 ({results.lostItems.length})
          </button>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 text-slate-500 font-bold">搜索中...</p>
          </div>
        ) : !query.trim() ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-slate-300">search</span>
            <p className="mt-4 text-slate-500 font-bold">请输入搜索关键词</p>
          </div>
        ) : getTotalCount() === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-slate-300">search_off</span>
            <p className="mt-4 text-slate-500 font-bold">未找到相关结果</p>
            <p className="mt-2 text-slate-400">试试其他关键词</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Notifications Results */}
            {(activeTab === 'all' || activeTab === 'notifications') && results.notifications.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-500">menu_book</span>
                  课程通知 ({results.notifications.length})
                </h2>
                <div className="space-y-4">
                  {results.notifications.map((item) => (
                    <Link
                      key={item.id}
                      to="/notifications"
                      className="block glass-card p-5 rounded-xl hover:bg-white/90 transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="size-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                          <span className="material-symbols-outlined">notification_important</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-blue-600 uppercase">{item.course}</span>
                            {item.is_important && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-xs font-bold">重要</span>
                            )}
                          </div>
                          <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{item.title}</h3>
                          <p className="text-sm text-slate-600 mt-1 line-clamp-2">{item.content}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Activities Results */}
            {(activeTab === 'all' || activeTab === 'activities') && results.activities.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-500">campaign</span>
                  活动公告 ({results.activities.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {results.activities.map((item) => (
                    <Link
                      key={item.id}
                      to={`/activities/${item.id}`}
                      className="glass-card rounded-xl overflow-hidden group hover:bg-white/90 transition-all"
                    >
                      <div className="relative aspect-video">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-3 left-3">
                          <span className="px-3 py-1 rounded-lg bg-white/90 backdrop-blur-md text-slate-900 text-xs font-bold">
                            {item.category}
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors mb-2">{item.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span className="material-symbols-outlined text-base">schedule</span>
                          {item.date}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Lost & Found Results */}
            {(activeTab === 'all' || activeTab === 'lost-found') && results.lostItems.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500">search</span>
                  失物招领 ({results.lostItems.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {results.lostItems.map((item) => (
                    <Link
                      key={item.id}
                      to={`/lost-and-found/${item.id}`}
                      className="glass-card rounded-xl overflow-hidden group hover:bg-white/90 transition-all"
                    >
                      <div className="relative aspect-[4/3]">
                        <img
                          src={item.images?.[0] || 'https://via.placeholder.com/400x300?text=No+Image'}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-3 left-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
                            item.type === 'lost' ? 'bg-red-500' : 'bg-emerald-500'
                          }`}>
                            {item.type === 'lost' ? '遗失' : '招领'}
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors mb-2">{item.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span className="material-symbols-outlined text-base">location_on</span>
                          {item.location}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
