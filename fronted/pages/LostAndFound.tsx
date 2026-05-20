import React, { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { lostItemsService, LostItem as ApiLostItem } from '../services/lostItems.service';
import { showToast } from '../components/Toast';
import DottedBackground from '../components/DottedBackground';
import { resolveImageUrl } from '../services/uploads.service';
import { formatDateTime } from '../utils/datetime';

const categoryConfig: Record<string, { label: string; icon: string; color: string }> = {
  electronics: { label: '电子数码', icon: 'devices', color: 'blue' },
  cards: { label: '证件卡片', icon: 'badge', color: 'purple' },
  books: { label: '书籍文具', icon: 'menu_book', color: 'green' },
  daily: { label: '生活用品', icon: 'coffee', color: 'amber' },
  clothing: { label: '服饰配件', icon: 'checkroom', color: 'pink' },
  sports: { label: '运动器材', icon: 'sports_basketball', color: 'red' },
  keys: { label: '钥匙', icon: 'key', color: 'slate' },
  other: { label: '其他', icon: 'more_horiz', color: 'gray' },
};

const categories = ['all', ...Object.keys(categoryConfig)];

// Reverse map: Chinese label → config (API returns labels, config keys are English)
const categoryByLabel = Object.fromEntries(
  Object.entries(categoryConfig).map(([, v]) => [v.label, v])
);

const LostAndFound: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [lostItems, setLostItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const searchRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { setVisible(true); }, []);

  // Read filters from URL params (single source of truth)
  const filter = searchParams.get('type') || 'all';
  const categoryFilter = searchParams.get('category') || 'all';
  const timeFilter = searchParams.get('time') || 'all';

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all' || value === '') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  // Search: local input with debounced URL sync
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (value) next.set('q', value);
      else next.delete('q');
      setSearchParams(next, { replace: true });
    }, 300);
  };

  // Fetch from API when type/category/time filters change
  useEffect(() => {
    const fetchLostItems = async () => {
      try {
        setIsLoading(true);
        const params: { type?: 'lost' | 'found'; category?: string } = {};
        if (filter !== 'all') params.type = filter as 'lost' | 'found';
        if (categoryFilter !== 'all') {
          // Convert English key to Chinese label for backend matching
          params.category = categoryConfig[categoryFilter]?.label;
        }

        const data = await lostItemsService.getAll(params);

        // Client-side time filter
        if (timeFilter !== 'all') {
          const now = new Date();
          setLostItems(data.filter(item => {
            const diffDays = (now.getTime() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24);
            if (timeFilter === 'week') return diffDays <= 7;
            if (timeFilter === 'month') return diffDays <= 30;
            return true;
          }));
        } else {
          setLostItems(data);
        }
      } catch (error) {
        showToast('加载失物招领信息失败', 'error');
        console.error('Failed to fetch lost items:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLostItems();
  }, [filter, categoryFilter, timeFilter]);

  // Client-side search filter
  const filteredItems = searchQuery
    ? lostItems.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : lostItems;

  return (
    <div className="relative min-h-screen">
      <DottedBackground />

      <div className={`relative z-10 w-full max-w-[1200px] mx-auto px-6 py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">失物招领</h1>
          <p className="text-lg text-slate-600 mt-1">如果您丢失或捡到了物品，请在此查看或发布。</p>
        </div>
        {user && (
          <Link
            to="/publish?type=lost-found"
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 transition-all"
          >
            <span className="material-symbols-outlined">add_circle</span>
            发布信息
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-4 mb-8 flex flex-col gap-4">
        {/* Type Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-slate-600">类型：</span>
          <button
            onClick={() => updateParam('type', 'all')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-white/60 text-slate-600 hover:bg-white/80'
              }`}
          >
            全部
          </button>
          <button
            onClick={() => updateParam('type', 'lost')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'lost'
                ? 'bg-primary text-white'
                : 'bg-white/60 text-slate-600 hover:bg-white/80'
              }`}
          >
            遗失
          </button>
          <button
            onClick={() => updateParam('type', 'found')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'found'
                ? 'bg-primary text-white'
                : 'bg-white/60 text-slate-600 hover:bg-white/80'
              }`}
          >
            招领
          </button>

          <div className="w-px h-6 bg-slate-300 mx-2"></div>

          <span className="text-sm font-bold text-slate-600">时间：</span>
          <button
            onClick={() => updateParam('time', 'all')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${timeFilter === 'all'
                ? 'bg-primary text-white'
                : 'bg-white/60 text-slate-600 hover:bg-white/80'
              }`}
          >
            全部
          </button>
          <button
            onClick={() => updateParam('time', 'week')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${timeFilter === 'week'
                ? 'bg-primary text-white'
                : 'bg-white/60 text-slate-600 hover:bg-white/80'
              }`}
          >
            本周
          </button>
          <button
            onClick={() => updateParam('time', 'month')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${timeFilter === 'month'
                ? 'bg-primary text-white'
                : 'bg-white/60 text-slate-600 hover:bg-white/80'
              }`}
          >
            本月
          </button>
        </div>

        {/* Category Filter & Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-600">类别：</span>
            <div className="flex bg-white/60 rounded-xl p-1 flex-wrap gap-1">
              <button
                onClick={() => updateParam('category', 'all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  categoryFilter === 'all'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                全部
              </button>
              {Object.entries(categoryConfig).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => updateParam('category', key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                    categoryFilter === key
                      ? 'bg-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                  style={categoryFilter === key ? { color: config.color === 'blue' ? '#3b82f6' :
                         config.color === 'purple' ? '#9333ea' :
                         config.color === 'green' ? '#22c55e' :
                         config.color === 'amber' ? '#f59e0b' :
                         config.color === 'pink' ? '#ec4899' :
                         config.color === 'red' ? '#ef4444' :
                         config.color === 'slate' ? '#64748b' : '#6b7280' } : {}}
                >
                  <span className="material-symbols-outlined text-sm">{config.icon}</span>
                  {config.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              type="text"
              placeholder="搜索物品名称或描述..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/60 text-slate-900 text-sm font-bold border-0 outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400 hover:bg-white/80 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-6 text-sm font-bold text-slate-500">
        {isLoading ? '加载中...' : `找到 ${filteredItems.length} 条结果`}
      </div>

      {/* Items Grid */}
      {isLoading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-slate-500 font-bold">加载中...</p>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <Link to={`/lost-and-found/${item.id}`} key={item.id} className="glass-card glass-card-hover rounded-2xl overflow-hidden group">
              <div className="relative aspect-[4/3]">
                <img
                  src={resolveImageUrl(item.images?.[0]) || '/no-image.png'}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-4 left-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg ${item.type === 'lost' ? 'bg-red-500' : 'bg-emerald-500'}`}>
                    {item.type === 'lost' ? '遗失' : '招领'}
                  </span>
                </div>
              </div>
              <div className="p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                  {(() => {
                    const catMeta = categoryByLabel[item.category] || categoryConfig[item.category];
                    return catMeta ? (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">{catMeta.icon}</span>
                        {catMeta.label}
                      </span>
                    ) : null;
                  })()}
                  {item.publisher && <span>• {item.publisher.name || '匿名用户'}</span>}
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">{item.title}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  {item.location}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  {formatDateTime(item.time)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-6xl text-slate-300">search_off</span>
          <p className="text-slate-500 font-bold mt-4">没有找到相关物品</p>
        </div>
      )}
      </div>
    </div>
  );
};

export default LostAndFound;
