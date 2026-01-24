
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { activitiesService, Activity as ApiActivity } from '../services/activities.service';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../components/Toast';

const Activities: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('全部类型');
  const [selectedStatus, setSelectedStatus] = useState<string>('全部状态');
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const categories = ['全部类型', '文艺', '讲座', '体育', '科创'];
  const statuses = ['全部状态', '报名中', '进行中', '已结束'];

  // Fetch activities from API
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setIsLoading(true);
        const params: { category?: string; status?: string } = {};
        if (selectedCategory !== '全部类型') params.category = selectedCategory;
        if (selectedStatus !== '全部状态') params.status = selectedStatus;

        const data = await activitiesService.getAll(params);
        setActivities(data);
      } catch (error) {
        showToast('加载活动失败', 'error');
        console.error('Failed to fetch activities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [selectedCategory, selectedStatus]);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar Filters */}
      <aside className="hidden lg:flex w-80 flex-col gap-6 border-r border-white/40 bg-white/40 backdrop-blur-lg p-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">活动筛选</h3>
          <button
            onClick={() => { setSelectedCategory('全部类型'); setSelectedStatus('全部状态'); }}
            className="text-sm font-medium text-primary hover:text-primary/80"
          >
            重置
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">活动类型</label>
          <div className="flex flex-col gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-left rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'bg-white/50 text-slate-700 hover:bg-white/80 border border-white/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">活动状态</label>
          <div className="flex flex-col gap-2">
            {statuses.map(status => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`text-left rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  selectedStatus === status
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'bg-white/50 text-slate-700 hover:bg-white/80 border border-white/60'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto">
          {/* Admin publish button in sidebar */}
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/publish?type=activity')}
              className="w-full rounded-xl bg-primary py-4 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-transform active:scale-95 hover:bg-blue-600"
            >
              发布新活动
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 py-8 md:px-12 lg:px-16 scroll-smooth">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight drop-shadow-sm">活动公告</h1>
              <p className="mt-2 text-slate-600 font-medium">发现校园里的精彩时刻，丰富你的大学生活。</p>
            </div>
            {/* Mobile filter button */}
            <button className="lg:hidden flex items-center gap-2 rounded-xl bg-white/40 px-5 py-2.5 text-sm font-semibold text-slate-800 transition-all hover:bg-white/70 hover:shadow-md border border-white/50 backdrop-blur-sm">
              <span className="material-symbols-outlined text-slate-600" style={{ fontSize: '20px' }}>filter_list</span>
              筛选
            </button>
          </div>

          {isLoading ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
              <p className="mt-4 text-lg font-medium text-slate-500">加载中...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <span className="material-symbols-outlined text-6xl text-slate-300" style={{ fontSize: '64px' }}>event_busy</span>
              <p className="mt-4 text-lg font-medium text-slate-500">暂无符合条件的活动</p>
            </div>
          ) : (
            <>
              {/* Featured Section (First Activity) */}
              {activities.length > 0 && (
                <Link to={`/activities/${activities[0].id}`} className="glass-card rounded-[2rem] overflow-hidden group cursor-pointer border-0 shadow-2xl relative block mb-10">
                  <div className="flex flex-col lg:flex-row min-h-[400px]">
                    <div className="w-full lg:w-1/2 relative overflow-hidden">
                      <img
                        src={activities[0].image}
                        alt={activities[0].title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent lg:hidden"></div>
                    </div>
                    <div className="w-full lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">{activities[0].category}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                          activities[0].status === '进行中' ? 'bg-blue-100 text-blue-700' :
                          activities[0].status === '已结束' ? 'bg-slate-100 text-slate-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {activities[0].status}
                        </span>
                      </div>
                      <h2 className="text-3xl font-extrabold text-slate-900 mb-4 leading-tight group-hover:text-primary transition-colors">
                        {activities[0].title}
                      </h2>
                      <p className="text-slate-600 mb-8 leading-relaxed line-clamp-3">
                        {activities[0].description}
                      </p>
                      <div className="flex flex-col gap-3 mb-8">
                        <div className="flex items-center gap-3 text-slate-500 font-medium">
                          <span className="material-symbols-outlined text-primary">calendar_today</span>
                          <span>{activities[0].date}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-500 font-medium">
                          <span className="material-symbols-outlined text-primary">location_on</span>
                          <span>{activities[0].location}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-500 font-medium">
                          <span className="material-symbols-outlined text-primary">apartment</span>
                          <span>{activities[0].organizer}</span>
                        </div>
                      </div>
                      <button className="w-fit bg-primary text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 transition-all active:scale-95">
                        立即报名
                      </button>
                    </div>
                  </div>
                </Link>
              )}

              {/* Grid Section */}
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
                {activities.slice(1).map((activity) => (
                  <Link key={activity.id} to={`/activities/${activity.id}`} className="glass-card rounded-[2rem] overflow-hidden group hover:bg-white/90 transition-all duration-500 cursor-pointer flex flex-col block">
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={activity.image}
                        alt={activity.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute top-4 left-4 flex gap-2">
                        <span className="px-3 py-1 rounded-lg bg-white/90 backdrop-blur-md text-slate-900 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                          {activity.category}
                        </span>
                        <span className={`px-3 py-1 rounded-lg backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                          activity.status === '进行中' ? 'bg-blue-500/90' : activity.status === '已结束' ? 'bg-slate-500/90' : 'bg-emerald-500/90'
                        }`}>
                          {activity.status}
                        </span>
                      </div>
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                      <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-primary transition-colors leading-snug">
                        {activity.title}
                      </h3>
                      <div className="flex flex-col gap-2 mb-4 text-sm font-medium text-slate-500">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-base">schedule</span>
                          {activity.date}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-base text-primary/70">apartment</span>
                          {activity.organizer}
                        </div>
                      </div>
                      <p className="text-slate-600 text-sm line-clamp-2 mb-6">
                        {activity.description}
                      </p>
                      <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                          <span className="material-symbols-outlined text-sm">location_on</span>
                          {activity.location}
                        </div>
                        <button className="text-primary text-sm font-bold flex items-center gap-1 group/btn">
                          详情 <span className="material-symbols-outlined text-base group-hover/btn:translate-x-1 transition-transform">chevron_right</span>
                        </button>
                      </div>
                    </div>
                  </Link>
                ))}
              </section>
            </>
          )}

          {/* Load More Button */}
          <div className="flex justify-center pb-12">
            <button className="flex items-center gap-2 rounded-full bg-white/30 px-8 py-3.5 text-sm font-bold text-slate-800 backdrop-blur-md transition-all hover:bg-white/50 hover:shadow-lg hover:-translate-y-1 border border-white/40">
              加载更多历史活动
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>history</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Activities;
