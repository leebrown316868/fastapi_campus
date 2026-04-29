import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DottedBackground from '../components/DottedBackground';

type Period = 'all' | 'month' | 'semester';

const Leaderboard: React.FC = () => {
  const [period, setPeriod] = useState<Period>('all');
  const [leaders, setLeaders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => { setVisible(true); }, []);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        const apiBase = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiBase}/api/leaderboard?period=${period}&limit=20`);
        if (response.ok) {
          const data = await response.json();
          setLeaders(data.items || []);
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, [period]);

  const periodLabels: Record<Period, string> = { all: '总榜', month: '月榜', semester: '学期榜' };

  const medalColors = ['text-amber-500', 'text-slate-400', 'text-amber-700'];

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      <DottedBackground />
      <div className={`relative z-10 flex h-full w-full transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-12 lg:px-16">
          <div className="mx-auto max-w-2xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-6 text-sm font-medium text-slate-500">
              <Link to="/home" className="hover:text-primary transition-colors">首页</Link>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <span className="text-slate-900 font-bold">积分排行榜</span>
            </div>

            <div className="mb-8">
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2 flex items-center gap-3">
                <span className="material-symbols-outlined text-amber-500" style={{fontSize:'36px'}}>leaderboard</span>
                积分排行榜
              </h1>
              <p className="text-slate-600 font-medium">积极参加活动，赢取积分上榜！</p>
            </div>

            {/* Period tabs */}
            <div className="flex gap-2 mb-6">
              {(Object.keys(periodLabels) as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    period === p
                      ? 'bg-primary text-white shadow-lg shadow-primary/25'
                      : 'bg-white/60 text-slate-500 hover:bg-white hover:text-slate-700'
                  }`}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>

            {/* Leaderboard */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-200 border-t-amber-500"></div>
              </div>
            ) : leaders.length === 0 ? (
              <div className="glass-card rounded-3xl p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-slate-300" style={{ fontSize: '64px' }}>social_leaderboard</span>
                <p className="mt-4 text-slate-500 font-medium">暂无排行数据</p>
                <p className="text-xs text-slate-400 mt-1">参与活动即可获得积分</p>
              </div>
            ) : (
              <div className="glass-card rounded-3xl overflow-hidden">
                {/* Top 3 podium */}
                <div className="bg-gradient-to-b from-amber-50/80 to-white p-8">
                  <div className="flex items-end justify-center gap-4">
                    {/* 2nd place */}
                    {leaders[1] && (
                      <div className="text-center">
                        <div className="size-16 rounded-full bg-slate-100 ring-4 ring-slate-200 mx-auto mb-2 overflow-hidden">
                          {leaders[1].avatar ? (
                            <img src={leaders[1].avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <span className="material-symbols-outlined text-2xl">person</span>
                            </div>
                          )}
                        </div>
                        <p className="text-2xl font-black text-slate-400">2</p>
                        <p className="text-sm font-bold text-slate-900 mt-1">{leaders[1].name}</p>
                        <p className="text-xs text-slate-500">{leaders[1].total_points} 分</p>
                      </div>
                    )}
                    {/* 1st place */}
                    {leaders[0] && (
                      <div className="text-center -mt-4">
                        <div className="size-20 rounded-full bg-amber-100 ring-4 ring-amber-300 mx-auto mb-2 overflow-hidden shadow-lg">
                          {leaders[0].avatar ? (
                            <img src={leaders[0].avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-amber-400">
                              <span className="material-symbols-outlined text-3xl">person</span>
                            </div>
                          )}
                        </div>
                        <p className="text-3xl">👑</p>
                        <p className="text-sm font-black text-slate-900 mt-1">{leaders[0].name}</p>
                        <p className="text-xs font-bold text-amber-600">{leaders[0].total_points} 分</p>
                      </div>
                    )}
                    {/* 3rd place */}
                    {leaders[2] && (
                      <div className="text-center">
                        <div className="size-16 rounded-full bg-amber-50 ring-4 ring-amber-200 mx-auto mb-2 overflow-hidden">
                          {leaders[2].avatar ? (
                            <img src={leaders[2].avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-amber-300">
                              <span className="material-symbols-outlined text-2xl">person</span>
                            </div>
                          )}
                        </div>
                        <p className="text-2xl font-black text-amber-700">3</p>
                        <p className="text-sm font-bold text-slate-900 mt-1">{leaders[2].name}</p>
                        <p className="text-xs text-slate-500">{leaders[2].total_points} 分</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rest of list */}
                <div className="p-4 space-y-2">
                  {leaders.slice(3).map((entry: any) => (
                    <div key={entry.user_id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                      <span className="w-8 text-center text-sm font-bold text-slate-400">{entry.rank}</span>
                      <div className="size-10 rounded-full bg-slate-100 overflow-hidden">
                        {entry.avatar ? (
                          <img src={entry.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <span className="material-symbols-outlined text-lg">person</span>
                          </div>
                        )}
                      </div>
                      <span className="flex-1 text-sm font-bold text-slate-900">{entry.name}</span>
                      <span className="text-sm font-black text-amber-600">{entry.total_points} 分</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Leaderboard;
