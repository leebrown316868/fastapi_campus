import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usersService } from '../services/users.service';
import { notificationsService } from '../services/notifications.service';
import { activitiesService } from '../services/activities.service';
import { lostItemsService } from '../services/lostItems.service';
import { showToast } from '../components/Toast';

type TabType = 'overview' | 'users' | 'notifications' | 'activities' | 'lost-found';
type EditModalType = 'notification' | 'activity' | 'lost-item' | null;

interface StatCard {
  title: string;
  value: number;
  change: string;
  icon: string;
  color: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  studentId?: string;
  role: 'user' | 'admin';
  is_verified: boolean;
  created_at: string;
  major?: string;
}

const AdminDashboard: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [lostItems, setLostItems] = useState<any[]>([]);

  // Edit modal states
  const [editModal, setEditModal] = useState<{
    type: EditModalType;
    item: any;
    isOpen: boolean;
  }>({ type: null, item: null, isOpen: false });
  const [isSaving, setIsSaving] = useState(false);

  // Stats
  const [stats, setStats] = useState<StatCard[]>([
    { title: '总用户数', value: 0, change: '+12%', icon: 'people', color: 'bg-blue-500' },
    { title: '今日发布', value: 0, change: '+5%', icon: 'add_circle', color: 'bg-emerald-500' },
    { title: '待审核', value: 0, change: '3 条', icon: 'pending', color: 'bg-amber-500' },
    { title: '活跃用户', value: 0, change: '+8%', icon: 'person_check', color: 'bg-indigo-500' },
  ]);

  // Load all data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [notifData, activityData, lostData] = await Promise.all([
        notificationsService.getAll(),
        activitiesService.getAll(),
        lostItemsService.getAll(),
      ]);

      setNotifications(notifData);
      setActivities(activityData);
      setLostItems(lostData);

      const today = new Date().toDateString();
      const todayPosts = [...notifData, ...activityData, ...lostData].filter(
        item => new Date(item.created_at).toDateString() === today
      ).length;

      setStats([
        { title: '总用户数', value: 0, change: '+12%', icon: 'people', color: 'bg-blue-500' },
        { title: '今日发布', value: todayPosts, change: `+${todayPosts}`, icon: 'add_circle', color: 'bg-emerald-500' },
        { title: '待审核', value: 0, change: '0 条', icon: 'pending', color: 'bg-amber-500' },
        { title: '活跃用户', value: 0, change: '+8%', icon: 'person_check', color: 'bg-indigo-500' },
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete handlers
  const handleDeleteNotification = async (id: number) => {
    if (!confirm('确定要删除这条通知吗？')) return;
    try {
      await notificationsService.delete(id);
      setNotifications(notifications.filter(n => n.id !== id));
      showToast('删除成功', 'success');
    } catch (error) {
      showToast('删除失败', 'error');
    }
  };

  const handleDeleteActivity = async (id: number) => {
    if (!confirm('确定要删除这个活动吗？')) return;
    try {
      await activitiesService.delete(id);
      setActivities(activities.filter(a => a.id !== id));
      showToast('删除成功', 'success');
    } catch (error) {
      showToast('删除失败', 'error');
    }
  };

  const handleDeleteLostItem = async (id: number) => {
    if (!confirm('确定要删除这条失物招领吗？')) return;
    try {
      await lostItemsService.delete(id);
      setLostItems(lostItems.filter(i => i.id !== id));
      showToast('删除成功', 'success');
    } catch (error) {
      showToast('删除失败', 'error');
    }
  };

  // Edit handlers
  const openEditModal = (type: EditModalType, item: any) => {
    setEditModal({ type, item, isOpen: true });
  };

  const closeEditModal = () => {
    setEditModal({ type: null, item: null, isOpen: false });
  };

  const handleSave = async (data: any) => {
    if (!editModal.item || isSaving) return;

    try {
      setIsSaving(true);

      if (editModal.type === 'notification') {
        const updated = await notificationsService.update(editModal.item.id, data);
        setNotifications(notifications.map(n => n.id === editModal.item.id ? updated : n));
        showToast('通知更新成功', 'success');
      } else if (editModal.type === 'activity') {
        const updated = await activitiesService.update(editModal.item.id, data);
        setActivities(activities.map(a => a.id === editModal.item.id ? updated : a));
        showToast('活动更新成功', 'success');
      } else if (editModal.type === 'lost-item') {
        // Lost items don't have update endpoint yet
        showToast('失物招领暂不支持编辑', 'warning');
        return;
      }

      closeEditModal();
    } catch (error: any) {
      showToast(error.message || '更新失败', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Render edit modal
  const renderEditModal = () => {
    if (!editModal.isOpen || !editModal.item) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closeEditModal}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
            <h3 className="text-xl font-bold text-slate-900">
              {editModal.type === 'notification' ? '编辑通知' :
               editModal.type === 'activity' ? '编辑活动' : '编辑失物招领'}
            </h3>
            <button onClick={closeEditModal} className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 space-y-4">
            {editModal.type === 'notification' && (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-900">标题</label>
                  <input
                    type="text"
                    defaultValue={editModal.item.title}
                    id="edit-title"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-900">内容</label>
                  <textarea
                    defaultValue={editModal.item.content}
                    id="edit-content"
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900">课程</label>
                    <input
                      type="text"
                      defaultValue={editModal.item.course}
                      id="edit-course"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900">发布者</label>
                    <input
                      type="text"
                      defaultValue={editModal.item.author}
                      id="edit-author"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-900">位置</label>
                  <input
                    type="text"
                    defaultValue={editModal.item.location || ''}
                    id="edit-location"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </>
            )}

            {editModal.type === 'activity' && (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-900">标题</label>
                  <input
                    type="text"
                    defaultValue={editModal.item.title}
                    id="edit-title"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-900">描述</label>
                  <textarea
                    defaultValue={editModal.item.description}
                    id="edit-description"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900">日期</label>
                    <input
                      type="text"
                      defaultValue={editModal.item.date}
                      id="edit-date"
                      placeholder="YYYY-MM-DD HH:MM"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900">地点</label>
                    <input
                      type="text"
                      defaultValue={editModal.item.location}
                      id="edit-location"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900">组织者</label>
                    <input
                      type="text"
                      defaultValue={editModal.item.organizer}
                      id="edit-organizer"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900">状态</label>
                    <select
                      defaultValue={editModal.item.status}
                      id="edit-status"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="报名中">报名中</option>
                      <option value="进行中">进行中</option>
                      <option value="已结束">已结束</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900">分类</label>
                    <select
                      defaultValue={editModal.item.category}
                      id="edit-category"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="文艺">文艺</option>
                      <option value="讲座">讲座</option>
                      <option value="体育">体育</option>
                      <option value="其他">其他</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900">图片 URL</label>
                    <input
                      type="text"
                      defaultValue={editModal.item.image}
                      id="edit-image"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 bg-white">
            <button
              onClick={closeEditModal}
              disabled={isSaving}
              className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={() => {
                const data: any = {};
                if (editModal.type === 'notification') {
                  const title = (document.getElementById('edit-title') as HTMLInputElement)?.value;
                  const content = (document.getElementById('edit-content') as HTMLTextAreaElement)?.value;
                  const course = (document.getElementById('edit-course') as HTMLInputElement)?.value;
                  const author = (document.getElementById('edit-author') as HTMLInputElement)?.value;
                  const location = (document.getElementById('edit-location') as HTMLInputElement)?.value;
                  if (title) data.title = title;
                  if (content) data.content = content;
                  if (course) data.course = course;
                  if (author) data.author = author;
                  if (location) data.location = location;
                } else if (editModal.type === 'activity') {
                  const title = (document.getElementById('edit-title') as HTMLInputElement)?.value;
                  const description = (document.getElementById('edit-description') as HTMLTextAreaElement)?.value;
                  const date = (document.getElementById('edit-date') as HTMLInputElement)?.value;
                  const location = (document.getElementById('edit-location') as HTMLInputElement)?.value;
                  const organizer = (document.getElementById('edit-organizer') as HTMLInputElement)?.value;
                  const status = (document.getElementById('edit-status') as HTMLSelectElement)?.value;
                  const category = (document.getElementById('edit-category') as HTMLSelectElement)?.value;
                  const image = (document.getElementById('edit-image') as HTMLInputElement)?.value;
                  if (title) data.title = title;
                  if (description) data.description = description;
                  if (date) data.date = date;
                  if (location) data.location = location;
                  if (organizer) data.organizer = organizer;
                  if (status) data.status = status;
                  if (category) data.category = category;
                  if (image) data.image = image;
                }
                handleSave(data);
              }}
              disabled={isSaving}
              className="px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  保存中...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">save</span>
                  保存更改
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render tab content
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block size-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-medium">加载数据中...</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`size-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                      <span className="material-symbols-outlined text-white text-2xl">{stat.icon}</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{stat.change}</span>
                  </div>
                  <h3 className="text-3xl font-black text-slate-900">{stat.value}</h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">{stat.title}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="font-bold text-slate-900">最新发布</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">类型</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">标题</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">发布时间</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {[...notifications.slice(0, 3), ...activities.slice(0, 3), ...lostItems.slice(0, 3)]
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .slice(0, 5)
                      .map((item) => {
                        const type = notifications.find(n => n.id === item.id) ? '通知' :
                                      activities.find(a => a.id === item.id) ? '活动' : '失物';
                        const typeColor = type === '通知' ? 'bg-blue-100 text-blue-700' :
                                         type === '活动' ? 'bg-emerald-100 text-emerald-700' :
                                         'bg-amber-100 text-amber-700';
                        return (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-lg text-xs font-bold ${typeColor}`}>{type}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-medium text-slate-900">{item.title}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                              {new Date(item.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                已发布
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <span className="material-symbols-outlined text-5xl text-slate-300">notifications</span>
                <p className="mt-3 text-slate-500 font-medium">暂无通知</p>
              </div>
            ) : (
              notifications.map(item => (
                <div key={item.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-center justify-between group">
                  <div className="flex items-center gap-5">
                    <div className="size-12 rounded-xl bg-blue-50 flex items-center justify-center">
                      <span className="material-symbols-outlined text-blue-600">notification_important</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{item.title}</h4>
                      <p className="text-xs text-slate-500 font-medium">{item.course} • {new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal('notification', item)}
                      className="size-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-primary hover:border-primary/30 transition-colors"
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteNotification(item.id)}
                      className="size-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-500 hover:border-red-200 transition-colors"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case 'activities':
        return (
          <div className="space-y-4">
            {activities.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <span className="material-symbols-outlined text-5xl text-slate-300">event</span>
                <p className="mt-3 text-slate-500 font-medium">暂无活动</p>
              </div>
            ) : (
              activities.map(item => (
                <div key={item.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-center justify-between group">
                  <div className="flex items-center gap-5">
                    <div className="size-16 rounded-xl overflow-hidden">
                      <img src={item.image} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{item.title}</h4>
                      <p className="text-xs text-slate-500 font-medium">{item.date} • {item.location}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase">{item.status}</span>
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[10px] font-bold uppercase">{item.category}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal('activity', item)}
                      className="size-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-primary hover:border-primary/30 transition-colors"
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteActivity(item.id)}
                      className="size-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-500 hover:border-red-200 transition-colors"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case 'lost-found':
        return (
          <div className="space-y-4">
            {lostItems.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <span className="material-symbols-outlined text-5xl text-slate-300">search</span>
                <p className="mt-3 text-slate-500 font-medium">暂无失物招领</p>
              </div>
            ) : (
              lostItems.map(item => (
                <div key={item.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-center justify-between group">
                  <div className="flex items-center gap-5">
                    {item.images?.[0] ? (
                      <div className="size-16 rounded-xl overflow-hidden">
                        <img src={item.images[0]} className="w-full h-full object-cover" alt="" />
                      </div>
                    ) : (
                      <div className="size-16 rounded-xl bg-slate-100 flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-400">image</span>
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-slate-900">{item.title}</h4>
                      <p className="text-xs text-slate-500 font-medium">{item.location} • 发布于 {new Date(item.created_at).toLocaleDateString()}</p>
                      <div className="flex gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${item.type === 'lost' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {item.type === 'lost' ? '遗失' : '招领'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">{item.category}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeleteLostItem(item.id)}
                      className="size-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-500 hover:border-red-200 transition-colors"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-lg">管理后台</h1>
              <p className="text-xs text-slate-500">Campus Hub</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'overview'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="material-symbols-outlined">dashboard</span>
            数据概览
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'notifications'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="material-symbols-outlined">notification_important</span>
            课程通知
            <span className={`ml-auto px-2 py-0.5 rounded text-xs font-bold ${activeTab === 'notifications' ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
              {notifications.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('activities')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'activities'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="material-symbols-outlined">event</span>
            活动公告
            <span className={`ml-auto px-2 py-0.5 rounded text-xs font-bold ${activeTab === 'activities' ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
              {activities.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('lost-found')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'lost-found'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="material-symbols-outlined">search</span>
            失物招领
            <span className={`ml-auto px-2 py-0.5 rounded text-xs font-bold ${activeTab === 'lost-found' ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
              {lostItems.length}
            </span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
            <div className="size-10 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold">
              {currentUser?.name?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 text-sm truncate">{currentUser?.name}</p>
              <p className="text-xs text-slate-500 truncate">{currentUser?.email}</p>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase">管理员</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {activeTab === 'overview' ? '数据概览' :
                 activeTab === 'notifications' ? '课程通知管理' :
                 activeTab === 'activities' ? '活动公告管理' :
                 activeTab === 'lost-found' ? '失物招领管理' : '管理后台'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {activeTab === 'overview' ? '查看平台运营数据统计' :
                 activeTab === 'notifications' ? `共 ${notifications.length} 条通知` :
                 activeTab === 'activities' ? `共 ${activities.length} 个活动` :
                 `共 ${lostItems.length} 条失物招领`}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
                <input
                  type="text"
                  placeholder="搜索..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-64"
                />
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">
          {renderContent()}
        </div>
      </main>

      {/* Edit Modal */}
      {renderEditModal()}
    </div>
  );
};

export default AdminDashboard;
