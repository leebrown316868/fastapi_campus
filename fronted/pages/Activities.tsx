
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { activitiesService, Activity as ApiActivity } from '../services/activities.service';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../components/Toast';
import DottedBackground from '../components/DottedBackground';

const Activities: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('全部类型');
  const [selectedStatus, setSelectedStatus] = useState<string>('全部状态');
  const [selectedTime, setSelectedTime] = useState<'all' | 'week' | 'month'>('all');
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  const categories = ['全部类型', '文艺', '讲座', '体育', '科创'];
  const statuses = ['全部状态', '报名中', '进行中', '已结束'];
  const timeFilters = [
    { value: 'all' as const, label: '全部时间' },
    { value: 'week' as const, label: '本周' },
    { value: 'month' as const, label: '本月' },
  ];

  // Fetch activities from API
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setIsLoading(true);
        const params: { category?: string; status?: string } = {};
        if (selectedCategory !== '全部类型') params.category = selectedCategory;
        if (selectedStatus !== '全部状态') params.status = selectedStatus;

        const data = await activitiesService.getAll(params);

        // Client-side time filter
        if (selectedTime !== 'all') {
          const now = new Date();
          const filteredData = data.filter(activity => {
            const activityDate = new Date(activity.date);
            const diffTime = activityDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (selectedTime === 'week') {
              return diffDays >= 0 && diffDays <= 7;
            } else if (selectedTime === 'month') {
              return diffDays >= 0 && diffDays <= 30;
            }
            return true;
          });
          setActivities(filteredData);
        } else {
          setActivities(data);
        }
      } catch (error) {
        showToast('加载活动失败', 'error');
        console.error('Failed to fetch activities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [selectedCategory, selectedStatus, selectedTime]);

  return (
    <div className="relative min-h-screen">
      {/* Dynamic Dotted Background */}
      <DottedBackground />

      <div className={`relative z-10 w-full max-w-[1200px] mx-auto px-6 py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">活动公告</h1>
            <p className="text-lg text-slate-600 mt-1">发现校园里的精彩时刻，丰富你的大学生活。</p>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card rounded-2xl p-4 mb-8 flex flex-col gap-4">
          {/* Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-600">类型：</span>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  selectedCategory === cat
                    ? 'bg-primary text-white'
                    : 'bg-white/60 text-slate-600 hover:bg-white/80'
                }`}
              >
                {cat}
              </button>
            ))}

            <div className="w-px h-6 bg-slate-300 mx-2"></div>

            <span className="text-sm font-bold text-slate-600">状态：</span>
            {statuses.map(status => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  selectedStatus === status
                    ? 'bg-primary text-white'
                    : 'bg-white/60 text-slate-600 hover:bg-white/80'
                }`}
              >
                {status}
              </button>
            ))}

            <div className="w-px h-6 bg-slate-300 mx-2"></div>

            <span className="text-sm font-bold text-slate-600">时间：</span>
            {timeFilters.map(filter => (
              <button
                key={filter.value}
                onClick={() => setSelectedTime(filter.value)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  selectedTime === filter.value
                    ? 'bg-primary text-white'
                    : 'bg-white/60 text-slate-600 hover:bg-white/80'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6 text-sm font-bold text-slate-500">
          {isLoading ? '加载中...' : `找到 ${activities.length} 个活动`}
        </div>

        {/* Activities List */}
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
                    {activities[0].notes && (
                      <div className="flex items-start gap-3 text-amber-600 font-medium bg-amber-50 rounded-lg p-3">
                        <span className="material-symbols-outlined text-amber-600 text-sm mt-0.5">info</span>
                        <div>
                          <span className="text-xs font-bold">注意事项：</span>
                          <span className="text-sm ml-1">{activities[0].notes}</span>
                        </div>
                      </div>
                    )}
                    {activities[0].registration_start && activities[0].registration_end && (
                      <div className="flex items-center gap-3 text-emerald-600 font-medium">
                        <span className="material-symbols-outlined text-emerald-600">how_to_reg</span>
                        <span className="text-sm">需报名</span>
                      </div>
                    )}
                  </div>
                  <button className={`w-fit px-8 py-3.5 rounded-2xl font-bold shadow-lg hover:-translate-y-1 transition-all active:scale-95 ${
                    activities[0].registration_start && activities[0].registration_end
                      ? 'bg-primary text-white shadow-primary/30 hover:shadow-primary/50'
                      : 'bg-slate-100 text-slate-700 shadow-slate-200 hover:bg-slate-200'
                  }`}>
                    {activities[0].registration_start && activities[0].registration_end ? '立即报名' : '查看详情'}
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
                    {activity.notes && (
                      <div className="flex items-center gap-1.5 text-amber-600">
                        <span className="material-symbols-outlined text-sm">info</span>
                        <span className="text-xs">有注意事项</span>
                      </div>
                    )}
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
      </div>
    </div>
  );
};

export default Activities;
