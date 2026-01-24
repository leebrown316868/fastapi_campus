import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { lostItemsService, LostItem as ApiLostItem } from '../services/lostItems.service';
import { showToast } from '../components/Toast';

const LostAndFound: React.FC = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'lost' | 'found'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lostItems, setLostItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch lost items from API
  useEffect(() => {
    const fetchLostItems = async () => {
      try {
        setIsLoading(true);
        const params: { type?: 'lost' | 'found'; category?: string } = {};
        if (filter !== 'all') params.type = filter;
        if (categoryFilter !== 'all') params.category = categoryFilter;

        const data = await lostItemsService.getAll(params);
        setLostItems(data);
      } catch (error) {
        showToast('加载失物招领信息失败', 'error');
        console.error('Failed to fetch lost items:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLostItems();
  }, [filter, categoryFilter]);

  // Get all categories from current items
  const categories = ['all', ...Array.from(new Set(lostItems.map(item => item.category)))];

  // Client-side search filter
  const filteredItems = lostItems.filter(item => {
    return searchQuery === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="w-full max-w-[1200px] mx-auto px-6 py-8">
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
      <div className="glass-card rounded-2xl p-4 mb-8 flex flex-col lg:flex-row gap-4">
        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white/60 text-slate-600 hover:bg-white/80'
              }`}
          >
            全部
          </button>
          <button
            onClick={() => setFilter('lost')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'lost'
                ? 'bg-red-500 text-white'
                : 'bg-white/60 text-slate-600 hover:bg-white/80'
              }`}
          >
            遗失
          </button>
          <button
            onClick={() => setFilter('found')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'found'
                ? 'bg-emerald-500 text-white'
                : 'bg-white/60 text-slate-600 hover:bg-white/80'
              }`}
          >
            招领
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white/60 text-slate-600 text-sm font-bold border-0 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer hover:bg-white/80 transition-all"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? '全部分类' : cat}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input
            type="text"
            placeholder="搜索物品名称或描述..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/60 text-slate-900 text-sm font-bold border-0 outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400 hover:bg-white/80 transition-all"
          />
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
                  src={item.images?.[0] || 'https://via.placeholder.com/400x300?text=No+Image'}
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
                  {item.category} {item.publisher && `• ${item.publisher.name}`}
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">{item.title}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  {item.location}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  {item.time}
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
  );
};

export default LostAndFound;