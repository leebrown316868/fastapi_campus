import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { searchService, SearchResultItem } from '../services/search.service';
import { showToast } from '../components/Toast';
import DottedBackground from '../components/DottedBackground';

type TabType = 'all' | 'notifications' | 'activities' | 'lost-items';

const SearchResults: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [counts, setCounts] = useState({ notifications: 0, activities: 0, lost_items: 0 });

  useEffect(() => {
    setVisible(true);
  }, []);

  useEffect(() => {
    const doSearch = async () => {
      if (!query.trim()) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await searchService.search(query, activeTab);
        setResults(data.results);
        setCounts(data.counts);
      } catch (error) {
        showToast('搜索失败', 'error');
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    doSearch();
  }, [query, activeTab]);

  const getTotalCount = () => {
    if (activeTab === 'all') {
      return counts.notifications + counts.activities + counts.lost_items;
    }
    const key = activeTab === 'lost-items' ? 'lost_items' : activeTab;
    return counts[key as keyof typeof counts] || 0;
  };

  const getActiveCount = () => {
    return results.length;
  };

  const getItemLink = (item: SearchResultItem) => {
    switch (item.type) {
      case 'notification': return '/notifications';
      case 'activity': return `/activities/${item.id}`;
      case 'lost_item': return `/lost-and-found/${item.id}`;
      default: return '/';
    }
  };

  return (
    <div className="relative min-h-screen">
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
            课程通知 ({counts.notifications})
          </button>
          <button
            onClick={() => setActiveTab('activities')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'activities'
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'bg-white/60 text-slate-600 hover:bg-white/80'
            }`}
          >
            活动公告 ({counts.activities})
          </button>
          <button
            onClick={() => setActiveTab('lost-items')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'lost-items'
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'bg-white/60 text-slate-600 hover:bg-white/80'
            }`}
          >
            失物招领 ({counts.lost_items})
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
        ) : getActiveCount() === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-slate-300">search_off</span>
            <p className="mt-4 text-slate-500 font-bold">未找到相关结果</p>
            <p className="mt-2 text-slate-400">试试其他关键词</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Notifications */}
            {(activeTab === 'all' || activeTab === 'notifications') && results.filter(r => r.type === 'notification').length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-500">menu_book</span>
                  课程通知 ({results.filter(r => r.type === 'notification').length})
                </h2>
                <div className="space-y-4">
                  {results.filter(r => r.type === 'notification').map((item) => (
                    <Link
                      key={`${item.type}-${item.id}`}
                      to={getItemLink(item)}
                      className="block glass-card p-5 rounded-xl hover:bg-white/90 transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="size-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                          <span className="material-symbols-outlined">notification_important</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-blue-600 uppercase">{item.extra.course}</span>
                            {item.extra.is_important && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-xs font-bold">重要</span>
                            )}
                          </div>
                          <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{item.title}</h3>
                          <p className="text-sm text-slate-600 mt-1 line-clamp-2">{item.description}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Activities */}
            {(activeTab === 'all' || activeTab === 'activities') && results.filter(r => r.type === 'activity').length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-500">campaign</span>
                  活动公告 ({results.filter(r => r.type === 'activity').length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {results.filter(r => r.type === 'activity').map((item) => (
                    <Link
                      key={`${item.type}-${item.id}`}
                      to={getItemLink(item)}
                      className="glass-card rounded-xl overflow-hidden group hover:bg-white/90 transition-all"
                    >
                      <div className="relative aspect-video">
                        <img
                          src={item.extra.image}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-3 left-3">
                          <span className="px-3 py-1 rounded-lg bg-white/90 backdrop-blur-md text-slate-900 text-xs font-bold">
                            {item.extra.category}
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors mb-2">{item.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span className="material-symbols-outlined text-base">schedule</span>
                          {item.extra.date}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Lost & Found */}
            {(activeTab === 'all' || activeTab === 'lost-items') && results.filter(r => r.type === 'lost_item').length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500">search</span>
                  失物招领 ({results.filter(r => r.type === 'lost_item').length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {results.filter(r => r.type === 'lost_item').map((item) => (
                    <Link
                      key={`${item.type}-${item.id}`}
                      to={getItemLink(item)}
                      className="glass-card rounded-xl overflow-hidden group hover:bg-white/90 transition-all"
                    >
                      <div className="relative aspect-[4/3]">
                        <img
                          src={item.extra.images?.[0] || 'https://via.placeholder.com/400x300?text=No+Image'}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-3 left-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
                            item.extra.item_type === 'lost' ? 'bg-red-500' : 'bg-emerald-500'
                          }`}>
                            {item.extra.item_type === 'lost' ? '遗失' : '招领'}
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors mb-2">{item.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span className="material-symbols-outlined text-base">location_on</span>
                          {item.extra.location}
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
