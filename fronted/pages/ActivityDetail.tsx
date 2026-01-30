import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { activitiesService } from '../services/activities.service';
import activityRegistrationsService, { ActivityRegistration } from '../services/activityRegistrations.service';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../components/Toast';

const ActivityDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activity, setActivity] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [myRegistrations, setMyRegistrations] = useState<ActivityRegistration[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        const data = await activitiesService.getById(parseInt(id));
        setActivity(data);
      } catch (error) {
        console.error('Failed to fetch activity:', error);
        showToast('加载活动失败', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivity();
  }, [id]);

  // Fetch user's registrations
  useEffect(() => {
    const fetchMyRegistrations = async () => {
      if (!user) return;

      try {
        const registrations = await activityRegistrationsService.getMyRegistrations();
        setMyRegistrations(registrations);
      } catch (error) {
        console.error('Failed to fetch registrations:', error);
      }
    };

    fetchMyRegistrations();
  }, [user]);

  // Check if user has registered for this activity
  const activityIdNum = parseInt(id || '0');
  const hasRegistered = myRegistrations.some(r => r.activity_id === activityIdNum && r.status === 'confirmed');

  // Handle registration button click
  const handleRegisterClick = () => {
    if (!user) {
      showToast('请先登录', 'warning');
      navigate('/login');
      return;
    }

    if (hasRegistered) {
      showToast('您已报名该活动', 'warning');
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  // Handle registration confirm
  const handleRegistrationConfirm = async () => {
    try {
      setIsRegistering(true);

      // Use user's profile information directly
      await activityRegistrationsService.create(parseInt(id || '0'), {
        name: user.name || '',
        student_id: user.student_id || '',
        phone: user.phone || '',
        remark: '',
      });

      showToast('报名成功！', 'success');
      setShowConfirmDialog(false);

      // Refresh registrations
      const registrations = await activityRegistrationsService.getMyRegistrations();
      setMyRegistrations(registrations);
    } catch (error: any) {
      console.error('Registration error:', error);
      showToast(error.response?.data?.detail || '报名失败，请稍后重试', 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  // Handle cancel registration
  const handleCancelRegistration = async () => {
    if (!user) return;

    const registration = myRegistrations.find(r => r.activity_id === activityIdNum && r.status === 'confirmed');
    if (!registration) return;

    try {
      setIsRegistering(true);
      await activityRegistrationsService.cancel(registration.id);
      showToast('已取消报名', 'success');

      // Refresh registrations
      const registrations = await activityRegistrationsService.getMyRegistrations();
      setMyRegistrations(registrations);
    } catch (error: any) {
      console.error('Cancel registration error:', error);
      showToast(error.response?.data?.detail || '取消报名失败', 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-[1000px] mx-auto px-6 py-10">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="w-full max-w-[1000px] mx-auto px-6 py-10">
        <div className="glass-card rounded-[2rem] p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-300" style={{ fontSize: '64px' }}>event_busy</span>
          <h2 className="mt-4 text-xl font-bold text-slate-900">活动不存在</h2>
          <p className="mt-2 text-slate-500">该活动可能已被删除或不存在</p>
          <Link
            to="/activities"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl bg-primary text-white font-bold hover:bg-blue-600 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            返回活动列表
          </Link>
        </div>
      </div>
    );
  }

  const hasRegistration = activity.registration_start && activity.registration_end;

  // Check registration status
  const now = new Date();
  const regStart = new Date(activity.registration_start);
  const regEnd = new Date(activity.registration_end);
  const actStart = new Date(activity.activity_start);
  const actEnd = activity.activity_end ? new Date(activity.activity_end) : null;

  let registrationStatus = 'open'; // 'open', 'not_started', 'ended', 'no_registration'
  let registrationStatusText = '';
  let activityStatus = 'upcoming'; // 'upcoming', 'ongoing', 'finished'

  // Check activity status
  if (actEnd && now >= actEnd) {
    activityStatus = 'finished';
  } else if (now >= actStart) {
    activityStatus = 'ongoing';
  }

  // Check registration status
  if (!hasRegistration) {
    registrationStatus = 'no_registration';
  } else if (now < regStart) {
    registrationStatus = 'not_started';
    const formatOptions = { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    registrationStatusText = '报名未开始（' + regStart.toLocaleDateString('zh-CN', formatOptions) + ' 开始）';
  } else if (now > regEnd) {
    registrationStatus = 'ended';
    registrationStatusText = '报名已结束';
  }

  return (
    <div className="w-full max-w-[1000px] mx-auto px-6 py-10">
      {/* Navigation & Back */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="size-10 rounded-xl bg-white/60 border border-white/60 shadow-sm flex items-center justify-center text-slate-600 hover:bg-white transition-all"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
          <Link to="/activities" className="hover:text-primary transition-colors">活动公告</Link>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-slate-900 font-bold">活动详情</span>
        </div>
      </div>

      <div className="glass-card rounded-[2.5rem] overflow-hidden border-0 shadow-2xl">
        <div className="aspect-[21/9] w-full relative overflow-hidden">
          {activity.image ? (
            <img src={activity.image} alt={activity.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-indigo-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-6xl text-primary/40">event</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>
          <div className="absolute bottom-8 left-8 right-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
                {activity.category}
              </span>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg ${
                activity.status === '进行中' ? 'bg-blue-500 text-white' :
                activity.status === '已结束' ? 'bg-slate-400 text-white' :
                'bg-emerald-500 text-white'
              }`}>
                {activity.status}
              </span>
              {hasRegistration && (
                <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-emerald-600 text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">how_to_reg</span>
                  需报名
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-md leading-tight">
              {activity.title}
            </h1>
          </div>
        </div>

        <div className="p-8 lg:p-12 flex flex-col lg:flex-row gap-12">
          <div className="flex-grow flex flex-col gap-8">
            <section>
              <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">description</span>
                活动描述
              </h3>
              <p className="text-slate-600 leading-relaxed text-lg whitespace-pre-line">
                {activity.description}
              </p>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-[1.5rem] bg-slate-50/50 border border-slate-100">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">时间安排</h4>
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">calendar_today</span>
                  </div>
                  <div>
                    <p className="font-black text-slate-900">{activity.date}</p>
                    <p className="text-xs text-slate-500 font-medium">请准时入场</p>
                  </div>
                </div>
              </div>
              <div className="p-6 rounded-[1.5rem] bg-slate-50/50 border border-slate-100">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">地点位置</h4>
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-emerald-500">
                    <span className="material-symbols-outlined">location_on</span>
                  </div>
                  <div>
                    <p className="font-black text-slate-900">{activity.location}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Registration Time Info */}
            {hasRegistration && (
              <div className="p-6 rounded-[1.5rem] bg-emerald-50/50 border border-emerald-100">
                <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">event_available</span>
                  报名时间
                </h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">开始</p>
                    <p className="font-bold text-slate-900">
                      {new Date(activity.registration_start).toLocaleString('zh-CN', {
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span className="text-slate-300">→</span>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-medium">结束</p>
                    <p className="font-bold text-slate-900">
                      {new Date(activity.registration_end).toLocaleString('zh-CN', {
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <aside className="w-full lg:w-80 shrink-0">
            <div className="glass-panel p-8 rounded-[2rem] sticky top-28 border border-white/50 shadow-xl">
              <h4 className="text-lg font-black text-slate-900 mb-6">主办方信息</h4>
              <div className="flex items-center gap-4 mb-8">
                <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl">school</span>
                </div>
                <div>
                  <p className="font-black text-slate-900 leading-tight">{activity.organizer}</p>
                  <p className="text-xs text-slate-500 font-medium">官方认证机构</p>
                </div>
              </div>

              <div className="space-y-4">
                {hasRegistered ? (
                  activityStatus === 'finished' ? (
                    <button disabled className="w-full bg-slate-300 text-white py-4 rounded-2xl font-black cursor-not-allowed">
                      活动已结束
                    </button>
                  ) : activityStatus === 'ongoing' ? (
                    <button disabled className="w-full bg-blue-400 text-white py-4 rounded-2xl font-black cursor-not-allowed">
                      活动进行中
                    </button>
                  ) : (
                    <button
                      onClick={handleCancelRegistration}
                      disabled={isRegistering}
                      className="w-full bg-rose-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-rose-500/30 hover:bg-rose-600 hover:shadow-rose-600/50 hover:-translate-y-1 transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isRegistering ? '处理中...' : '✕ 取消报名'}
                    </button>
                  )
                ) : hasRegistration && registrationStatus === 'open' ? (
                  <button
                    onClick={handleRegisterClick}
                    className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 transform active:scale-95 transition-all"
                  >
                    立即报名
                  </button>
                ) : hasRegistration && registrationStatus === 'not_started' ? (
                  <button disabled className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-amber-500/30 cursor-not-allowed">
                    {registrationStatusText}
                  </button>
                ) : hasRegistration && registrationStatus === 'ended' ? (
                  <button disabled className="w-full bg-slate-400 text-white py-4 rounded-2xl font-black cursor-not-allowed">
                    报名已结束
                  </button>
                ) : (
                  <button disabled className="w-full bg-slate-100 text-slate-400 py-4 rounded-2xl font-black cursor-not-allowed">
                    无需报名
                  </button>
                )}
                <button className="w-full bg-white border border-slate-200 text-slate-700 py-4 rounded-2xl font-black hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-xl">share</span>
                  分享活动
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 text-center">注意事项</p>
                {activity.notes ? (
                  <div className="text-xs text-slate-600 bg-amber-50 rounded-lg p-3">
                    <p className="whitespace-pre-wrap">{activity.notes}</p>
                  </div>
                ) : (
                  <ul className="text-xs text-slate-500 space-y-2">
                    <li className="flex gap-2">
                      <span className="material-symbols-outlined text-sm text-emerald-500">check_circle</span>
                      需携带学生证件
                    </li>
                    {hasRegistration && (
                      <li className="flex gap-2">
                        <span className="material-symbols-outlined text-sm text-emerald-500">check_circle</span>
                        名额有限，先到先得
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Registration Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowConfirmDialog(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">event_available</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">确认报名</h3>
              <p className="text-slate-600 mb-6">
                确定要报名参加<br/>
                <span className="font-bold text-slate-900">「{activity?.title}」</span><br/>
                吗？
              </p>

              <div className="flex flex-col gap-3 text-sm text-slate-500 mb-6">
                <div className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-lg">person</span>
                  <span>{user?.name}</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-lg">badge</span>
                  <span>{user?.student_id}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={isRegistering}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleRegistrationConfirm}
                  disabled={isRegistering}
                  className="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isRegistering ? (
                    <>
                      <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      报名中...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">check</span>
                      确认报名
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityDetail;
