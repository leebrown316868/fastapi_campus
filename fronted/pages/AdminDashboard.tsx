import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { notificationsService } from '../services/notifications.service';
import { activitiesService } from '../services/activities.service';
import { lostItemsService } from '../services/lostItems.service';
import { usersService } from '../services/users.service';
import activityRegistrationsService, { ActivityRegistration } from '../services/activityRegistrations.service';
import { showToast } from '../components/Toast';

type TabType = 'overview' | 'users' | 'notifications' | 'activities' | 'lost-found';
type EditModalType = 'notification' | 'activity' | 'lost-item' | null;

const AdminDashboard: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Data states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [lostItems, setLostItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Edit modal states
  const [editModal, setEditModal] = useState<{
    type: EditModalType;
    item: any;
    isOpen: boolean;
  }>({ type: null, item: null, isOpen: false });
  const [isSaving, setIsSaving] = useState(false);

  // Registration view modal states
  const [registrationsModal, setRegistrationsModal] = useState<{
    activityId: number | null;
    activityName: string;
    isOpen: boolean;
  }>({ activityId: null, activityName: '', isOpen: false });
  const [registrations, setRegistrations] = useState<ActivityRegistration[]>([]);
  const [registrationsTotal, setRegistrationsTotal] = useState(0);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false);

  // User import states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  // User management states
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

  // Filter states
  const [notifFilter, setNotifFilter] = useState<'all' | 'important'>('all');
  const [activityFilter, setActivityFilter] = useState<'all' | 'upcoming' | 'ended'>('all');
  const [activityTimeFilter, setActivityTimeFilter] = useState<'all' | 'week' | 'month' | 'later'>('all');
  const [lostItemTypeFilter, setLostItemTypeFilter] = useState<'all' | 'lost' | 'found'>('all');
  const [lostItemTimeFilter, setLostItemTimeFilter] = useState<'all' | 'week' | 'month'>('all');
  const [lostItemCategoryFilter, setLostItemCategoryFilter] = useState<'all' | '电子产品' | '证件卡片' | '学习用品' | '生活用品' | '其他'>('all');

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

  // Registration handlers
  const openRegistrationsModal = async (activityId: number, activityName: string) => {
    setRegistrationsModal({ activityId, activityName, isOpen: true });
    setIsLoadingRegistrations(true);

    try {
      const data = await activityRegistrationsService.getActivityRegistrations(activityId);
      setRegistrations(data.registrations);
      setRegistrationsTotal(data.total);
    } catch (error) {
      console.error('Failed to load registrations:', error);
      showToast('加载报名名单失败', 'error');
    } finally {
      setIsLoadingRegistrations(false);
    }
  };

  const closeRegistrationsModal = () => {
    setRegistrationsModal({ activityId: null, activityName: '', isOpen: false });
    setRegistrations([]);
    setRegistrationsTotal(0);
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
        const updated = await lostItemsService.update(editModal.item.id, data);
        setLostItems(lostItems.map(i => i.id === editModal.item.id ? updated : i));
        showToast('失物招领更新成功', 'success');
      }

      closeEditModal();
    } catch (error: any) {
      showToast(error.message || '更新失败', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // User import handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      if (!validTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        showToast('请选择 CSV 或 Excel 文件', 'error');
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      showToast('请先选择文件', 'error');
      return;
    }

    try {
      setIsUploading(true);
      const result = await usersService.importUsers(selectedFile);
      setImportResult(result);

      if (result.failed === 0) {
        showToast(`成功导入 ${result.success} 个用户`, 'success');
        setSelectedFile(null);
        // Reset file input
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        showToast(`导入完成：成功 ${result.success} 个，失败 ${result.failed} 个`, 'warning');
      }
    } catch (error: any) {
      showToast(error.message || '导入失败', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = `name,email,student_id,role,major,password
张三,zhangsan@example.com,2021001,user,计算机科学与技术,123456
李四,lisi@example.com,2021002,user,软件工程,123456
王五,wangwu@example.com,2021003,admin,信息安全,123456`;
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('模板已下载', 'success');
  };

  // User management functions
  const loadUsers = async () => {
    try {
      const userData = await usersService.getAll({
        search: search || undefined,
        is_active: userFilter === 'all' ? undefined : userFilter === 'active',
      });
      setUsers(userData);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleToggleUserStatus = async (user: any) => {
    try {
      const updated = await usersService.updateStatus(user.id, !user.is_active);
      setUsers(users.map(u => u.id === user.id ? updated : u));
      showToast(user.is_active ? '用户已禁用' : '用户已启用', 'success');
    } catch (error) {
      showToast('操作失败', 'error');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('确定要删除该用户吗？此操作不可恢复。')) return;
    try {
      await usersService.delete(id);
      setUsers(users.filter(u => u.id !== id));
      showToast('删除成功', 'success');
    } catch (error) {
      showToast('删除失败', 'error');
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedUsers.length === 0) {
      showToast('请先选择用户', 'warning');
      return;
    }

    const confirmMsg = action === 'delete'
      ? `确定要删除选中的 ${selectedUsers.length} 个用户吗？`
      : `确定要${action === 'activate' ? '启用' : '禁用'}选中的 ${selectedUsers.length} 个用户吗？`;

    if (!confirm(confirmMsg)) return;

    try {
      if (action === 'delete') {
        const result = await usersService.bulkDelete(selectedUsers);
        setUsers(users.filter(u => !selectedUsers.includes(u.id)));
        showToast(`已删除 ${result.deleted} 个用户`, 'success');
      } else {
        const result = await usersService.bulkUpdate(selectedUsers, action === 'activate');
        loadUsers();
        showToast(`已更新 ${result.updated} 个用户`, 'success');
      }
      setSelectedUsers([]);
    } catch (error: any) {
      showToast(error.message || '操作失败', 'error');
    }
  };

  const handleExportUsers = async () => {
    try {
      await usersService.exportUsers();
      showToast('导出成功', 'success');
    } catch (error) {
      showToast('导出失败', 'error');
    }
  };

  // Load users when users tab is active
  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab, userFilter, search]);

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
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-900">注意事项</label>
                  <textarea
                    defaultValue={editModal.item.notes || ''}
                    id="edit-notes"
                    rows={2}
                    placeholder="例如：请提前15分钟入场、活动期间请保持安静等"
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
                      <option value="学术讲座">学术讲座</option>
                      <option value="文艺演出">文艺演出</option>
                      <option value="体育赛事">体育赛事</option>
                      <option value="社团活动">社团活动</option>
                      <option value="志愿服务">志愿服务</option>
                      <option value="就业招聘">就业招聘</option>
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

            {editModal.type === 'lost-item' && (
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
                    <label className="block text-sm font-bold text-slate-900">地点</label>
                    <input
                      type="text"
                      defaultValue={editModal.item.location}
                      id="edit-location"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900">分类</label>
                    <select
                      defaultValue={editModal.item.category}
                      id="edit-category"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="电子产品">电子产品</option>
                      <option value="证件卡片">证件卡片</option>
                      <option value="学习用品">学习用品</option>
                      <option value="生活用品">生活用品</option>
                      <option value="其他">其他</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900">状态</label>
                    <select
                      defaultValue={editModal.item.status}
                      id="edit-status"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="pending">待处理</option>
                      <option value="resolved">已解决</option>
                    </select>
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
                  const notes = (document.getElementById('edit-notes') as HTMLTextAreaElement)?.value;
                  const date = (document.getElementById('edit-date') as HTMLInputElement)?.value;
                  const location = (document.getElementById('edit-location') as HTMLInputElement)?.value;
                  const organizer = (document.getElementById('edit-organizer') as HTMLInputElement)?.value;
                  const status = (document.getElementById('edit-status') as HTMLSelectElement)?.value;
                  const category = (document.getElementById('edit-category') as HTMLSelectElement)?.value;
                  const image = (document.getElementById('edit-image') as HTMLInputElement)?.value;
                  if (title) data.title = title;
                  if (description) data.description = description;
                  if (notes) data.notes = notes;
                  if (date) data.date = date;
                  if (location) data.location = location;
                  if (organizer) data.organizer = organizer;
                  if (status) data.status = status;
                  if (category) data.category = category;
                  if (image) data.image = image;
                } else if (editModal.type === 'lost-item') {
                  const title = (document.getElementById('edit-title') as HTMLInputElement)?.value;
                  const description = (document.getElementById('edit-description') as HTMLTextAreaElement)?.value;
                  const location = (document.getElementById('edit-location') as HTMLInputElement)?.value;
                  const category = (document.getElementById('edit-category') as HTMLSelectElement)?.value;
                  const status = (document.getElementById('edit-status') as HTMLSelectElement)?.value;
                  if (title) data.title = title;
                  if (description) data.description = description;
                  if (location) data.location = location;
                  if (category) data.category = category;
                  if (status) data.status = status;
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
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Notifications Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="size-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <span className="material-symbols-outlined text-white text-2xl">notification_important</span>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black text-slate-900">{notifications.length}</p>
                    <p className="text-sm font-medium text-slate-500 mt-1">条通知</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500">课程通知与公告</p>
                </div>
              </div>

              {/* Activities Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="size-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <span className="material-symbols-outlined text-white text-2xl">event</span>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black text-slate-900">{activities.length}</p>
                    <p className="text-sm font-medium text-slate-500 mt-1">个活动</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500">校园活动与讲座</p>
                </div>
              </div>

              {/* Lost & Found Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="size-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <span className="material-symbols-outlined text-white text-2xl">search</span>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black text-slate-900">{lostItems.length}</p>
                    <p className="text-sm font-medium text-slate-500 mt-1">条招领</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500">失物招领信息</p>
                </div>
              </div>
            </div>

            {/* Recent Posts Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">最新发布</h3>
                {search && (
                  <span className="text-sm text-slate-500">
                    搜索 "{search}" 的结果
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">类型</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">标题</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">发布时间</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">状态</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(() => {
                      // Combine all data and filter by search
                      const allItems = [...notifications, ...activities, ...lostItems];
                      const filteredItems = search
                        ? allItems.filter(item =>
                            item.title?.toLowerCase().includes(search.toLowerCase())
                          )
                        : allItems.slice(0, 5); // Show first 5 when no search

                      const sortedItems = filteredItems
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .slice(0, search ? undefined : 5);

                      if (sortedItems.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                              <div className="flex flex-col items-center">
                                <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">search_off</span>
                                <p>没有找到匹配的内容</p>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return sortedItems.map((item) => {
                        const isNotification = notifications.find(n => n.id === item.id);
                        const isActivity = activities.find(a => a.id === item.id);
                        const type = isNotification ? '通知' : isActivity ? '活动' : '失物';
                        const typeColor = type === '通知' ? 'bg-blue-100 text-blue-700' :
                                         type === '活动' ? 'bg-emerald-100 text-emerald-700' :
                                         'bg-amber-100 text-amber-700';
                        // Determine which tab to navigate to
                        const targetTab = isNotification ? 'notifications' : isActivity ? 'activities' : 'lost-found';
                        const editType: EditModalType = isNotification ? 'notification' : isActivity ? 'activity' : 'lost-item';

                        const handleDelete = (e: React.MouseEvent) => {
                          e.stopPropagation();
                          if (isNotification) {
                            handleDeleteNotification(item.id);
                          } else if (isActivity) {
                            handleDeleteActivity(item.id);
                          } else {
                            handleDeleteLostItem(item.id);
                          }
                        };

                        const handleEdit = (e: React.MouseEvent) => {
                          e.stopPropagation();
                          openEditModal(editType, item);
                        };

                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-lg text-xs font-bold ${typeColor}`}>{type}</span>
                            </td>
                            <td className="px-6 py-4 cursor-pointer hover:text-primary" onClick={() => setActiveTab(targetTab as TabType)}>
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
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex gap-2">
                                <button
                                  onClick={handleEdit}
                                  className="size-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-primary hover:border-primary/30 transition-colors"
                                  title="编辑"
                                >
                                  <span className="material-symbols-outlined text-sm">edit</span>
                                </button>
                                <button
                                  onClick={handleDelete}
                                  className="size-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-500 hover:border-red-200 transition-colors"
                                  title="删除"
                                >
                                  <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-500">筛选：</span>
                <div className="flex bg-slate-100 rounded-xl p-1">
                  <button
                    onClick={() => setNotifFilter('all')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      notifFilter === 'all'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    全部 ({notifications.length})
                  </button>
                  <button
                    onClick={() => setNotifFilter('important')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      notifFilter === 'important'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    重要 ({notifications.filter(n => n.is_important).length})
                  </button>
                </div>
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <span className="material-symbols-outlined text-5xl text-slate-300">notifications</span>
                <p className="mt-3 text-slate-500 font-medium">暂无通知</p>
              </div>
            ) : (
              notifications
                .filter(item => {
                  if (notifFilter === 'important') return item.is_important;
                  return true;
                })
                .map(item => (
                  <div key={item.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-center justify-between group">
                    <div className="flex items-center gap-5">
                      <div className="size-12 rounded-xl bg-blue-50 flex items-center justify-center">
                        <span className="material-symbols-outlined text-blue-600">notification_important</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900">{item.title}</h4>
                          {item.is_important && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-xs font-bold">重要</span>
                          )}
                        </div>
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
            {/* Filter Bar */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-500">状态：</span>
                  <div className="flex bg-slate-100 rounded-xl p-1">
                    <button
                      onClick={() => setActivityFilter('all')}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        activityFilter === 'all'
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      全部
                    </button>
                    <button
                      onClick={() => setActivityFilter('upcoming')}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        activityFilter === 'upcoming'
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      进行中
                    </button>
                    <button
                      onClick={() => setActivityFilter('ended')}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        activityFilter === 'ended'
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      已结束
                    </button>
                  </div>
                </div>
                <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-500">时间：</span>
                  <div className="flex bg-slate-100 rounded-xl p-1">
                    <button
                      onClick={() => setActivityTimeFilter('all')}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        activityTimeFilter === 'all'
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      全部
                    </button>
                    <button
                      onClick={() => setActivityTimeFilter('week')}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        activityTimeFilter === 'week'
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      本周
                    </button>
                    <button
                      onClick={() => setActivityTimeFilter('month')}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        activityTimeFilter === 'month'
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      本月
                    </button>
                    <button
                      onClick={() => setActivityTimeFilter('later')}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        activityTimeFilter === 'later'
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      更远
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {activities.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <span className="material-symbols-outlined text-5xl text-slate-300">event</span>
                <p className="mt-3 text-slate-500 font-medium">暂无活动</p>
              </div>
            ) : (
              activities
                .filter(item => {
                  // Status filter
                  if (activityFilter === 'upcoming') {
                    if (!['报名中', '进行中'].includes(item.status)) return false;
                  } else if (activityFilter === 'ended') {
                    if (item.status !== '已结束') return false;
                  }

                  // Time filter
                  if (activityTimeFilter !== 'all') {
                    const now = new Date();
                    const itemDate = new Date(item.date);
                    const diffTime = itemDate.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (activityTimeFilter === 'week') {
                      if (diffDays < 0 || diffDays > 7) return false;
                    } else if (activityTimeFilter === 'month') {
                      if (diffDays < 0 || diffDays > 30) return false;
                    } else if (activityTimeFilter === 'later') {
                      if (diffDays <= 30) return false;
                    }
                  }

                  return true;
                })
                .map(item => (
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
                      onClick={() => openRegistrationsModal(item.id, item.title)}
                      className="px-4 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-primary hover:border-primary/30 transition-colors text-sm font-medium"
                      title="查看报名名单"
                    >
                      <span className="material-symbols-outlined text-lg mr-1">groups</span>
                      报名
                    </button>
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
            {/* Filter Bar */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
              <div className="space-y-3">
                {/* Type Filter */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-500 min-w-fit">类型：</span>
                  <div className="flex bg-slate-100 rounded-xl p-1">
                    <button
                      onClick={() => setLostItemTypeFilter('all')}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        lostItemTypeFilter === 'all'
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      全部
                    </button>
                    <button
                      onClick={() => setLostItemTypeFilter('lost')}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        lostItemTypeFilter === 'lost'
                          ? 'bg-white text-red-500 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      遗失
                    </button>
                    <button
                      onClick={() => setLostItemTypeFilter('found')}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        lostItemTypeFilter === 'found'
                          ? 'bg-white text-emerald-500 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      招领
                    </button>
                  </div>
                </div>

                {/* Time & Category Filters */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-500 min-w-fit">时间：</span>
                    <div className="flex bg-slate-100 rounded-xl p-1">
                      <button
                        onClick={() => setLostItemTimeFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          lostItemTimeFilter === 'all'
                            ? 'bg-white text-primary shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        全部
                      </button>
                      <button
                        onClick={() => setLostItemTimeFilter('week')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          lostItemTimeFilter === 'week'
                            ? 'bg-white text-primary shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        本周
                      </button>
                      <button
                        onClick={() => setLostItemTimeFilter('month')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          lostItemTimeFilter === 'month'
                            ? 'bg-white text-primary shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        本月
                      </button>
                    </div>
                  </div>

                  <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-500 min-w-fit">分类：</span>
                    <div className="flex bg-slate-100 rounded-xl p-1">
                      <button
                        onClick={() => setLostItemCategoryFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          lostItemCategoryFilter === 'all'
                            ? 'bg-white text-primary shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        全部
                      </button>
                      <button
                        onClick={() => setLostItemCategoryFilter('电子产品')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          lostItemCategoryFilter === '电子产品'
                            ? 'bg-white text-primary shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        电子产品
                      </button>
                      <button
                        onClick={() => setLostItemCategoryFilter('证件卡片')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          lostItemCategoryFilter === '证件卡片'
                            ? 'bg-white text-primary shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        证件卡片
                      </button>
                      <button
                        onClick={() => setLostItemCategoryFilter('学习用品')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          lostItemCategoryFilter === '学习用品'
                            ? 'bg-white text-primary shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        学习用品
                      </button>
                      <button
                        onClick={() => setLostItemCategoryFilter('生活用品')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          lostItemCategoryFilter === '生活用品'
                            ? 'bg-white text-primary shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        生活用品
                      </button>
                      <button
                        onClick={() => setLostItemCategoryFilter('其他')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          lostItemCategoryFilter === '其他'
                            ? 'bg-white text-primary shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        其他
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {lostItems.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <span className="material-symbols-outlined text-5xl text-slate-300">search</span>
                <p className="mt-3 text-slate-500 font-medium">暂无失物招领</p>
              </div>
            ) : (
              lostItems
                .filter(item => {
                  // Type filter
                  if (lostItemTypeFilter !== 'all') {
                    if (lostItemTypeFilter === 'lost' && item.type !== 'lost') return false;
                    if (lostItemTypeFilter === 'found' && item.type !== 'found') return false;
                  }

                  // Category filter
                  if (lostItemCategoryFilter !== 'all') {
                    if (item.category !== lostItemCategoryFilter) return false;
                  }

                  // Time filter (based on created_at)
                  if (lostItemTimeFilter !== 'all') {
                    const now = new Date();
                    const createdDate = new Date(item.created_at);
                    const diffTime = now.getTime() - createdDate.getTime();
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                    if (lostItemTimeFilter === 'week') {
                      if (diffDays > 7) return false;
                    } else if (lostItemTimeFilter === 'month') {
                      if (diffDays > 30) return false;
                    }
                  }

                  return true;
                })
                .map(item => (
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
                      onClick={() => openEditModal('lost-item', item)}
                      className="size-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-primary hover:border-primary/30 transition-colors"
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
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

      case 'users':
        return (
          <div className="space-y-6">
            {/* Actions Bar */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex bg-slate-100 rounded-xl p-1">
                    <button
                      onClick={() => setUserFilter('all')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        userFilter === 'all'
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      全部 ({users.length})
                    </button>
                    <button
                      onClick={() => setUserFilter('active')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        userFilter === 'active'
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      在校
                    </button>
                    <button
                      onClick={() => setUserFilter('inactive')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        userFilter === 'inactive'
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      毕业禁用
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedUsers.length > 0 && (
                    <>
                      <button
                        onClick={() => handleBulkAction('activate')}
                        className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 font-medium text-sm hover:bg-emerald-100 transition-colors"
                      >
                        批量启用
                      </button>
                      <button
                        onClick={() => handleBulkAction('deactivate')}
                        className="px-4 py-2 rounded-xl bg-amber-50 text-amber-700 font-medium text-sm hover:bg-amber-100 transition-colors"
                      >
                        批量禁用
                      </button>
                      <button
                        onClick={() => handleBulkAction('delete')}
                        className="px-4 py-2 rounded-xl bg-red-50 text-red-700 font-medium text-sm hover:bg-red-100 transition-colors"
                      >
                        批量删除
                      </button>
                      <div className="w-px h-6 bg-slate-200"></div>
                    </>
                  )}
                  <button
                    onClick={handleExportUsers}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-medium text-sm hover:bg-slate-200 transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined">download</span>
                    导出
                  </button>
                </div>
              </div>
            </div>

            {/* User List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left w-12">
                        <input
                          type="checkbox"
                          checked={selectedUsers.length > 0 && selectedUsers.length === users.length}
                          onChange={(e) => setSelectedUsers(e.target.checked ? users.map(u => u.id) : [])}
                          className="w-4 h-4 rounded border-slate-300"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">学号</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">姓名</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">邮箱</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">专业</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">角色</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">状态</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center">
                            <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">people</span>
                            <p>暂无用户数据</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUsers([...selectedUsers, user.id]);
                                } else {
                                  setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                                }
                              }}
                              className="w-4 h-4 rounded border-slate-300"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{user.student_id}</td>
                          <td className="px-6 py-4 text-sm text-slate-900 font-medium">{user.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{user.email}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{user.major || '-'}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                              user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {user.role === 'admin' ? '管理员' : '学生'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleToggleUserStatus(user)}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                user.is_active
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              <span className="material-symbols-outlined text-sm">
                                {user.is_active ? 'check_circle' : 'cancel'}
                              </span>
                              {user.is_active ? '启用' : '禁用'}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {user.role !== 'admin' && (
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="size-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-500 hover:border-red-200 transition-colors"
                                  title="删除"
                                >
                                  <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Import Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">批量导入用户</h3>
                  <p className="text-sm text-slate-500 mt-1">支持 CSV 或 Excel 文件格式</p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-medium text-sm hover:bg-slate-200 transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">download</span>
                  下载模板
                </button>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {!selectedFile ? (
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                      <span className="material-symbols-outlined text-3xl text-slate-400">upload_file</span>
                    </div>
                    <p className="text-slate-900 font-medium mb-1">点击选择文件</p>
                    <p className="text-sm text-slate-500">支持 .csv, .xlsx, .xls 格式</p>
                  </label>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary">description</span>
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-slate-900">{selectedFile.name}</p>
                        <p className="text-sm text-slate-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setImportResult(null);
                        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                        if (fileInput) fileInput.value = '';
                      }}
                      className="size-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                )}
              </div>

              {selectedFile && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleImport}
                    disabled={isUploading}
                    className="px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        导入中...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">upload</span>
                        开始导入
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Import Results */}
              {importResult && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50">
                    <div className="flex items-center gap-6 flex-1">
                      <div className="text-center">
                        <p className="text-2xl font-black text-emerald-600">{importResult.success}</p>
                        <p className="text-xs text-slate-500">成功</p>
                      </div>
                      {importResult.failed > 0 && (
                        <div className="text-center">
                          <p className="text-2xl font-black text-red-500">{importResult.failed}</p>
                          <p className="text-xs text-slate-500">失败</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="bg-red-50 rounded-xl p-4">
                      <p className="font-bold text-red-700 mb-2">错误详情：</p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {importResult.errors.map((error, idx) => (
                          <p key={idx} className="text-sm text-red-600">{error}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-4">导入说明</h4>
              <div className="space-y-3 text-sm text-slate-600">
                <p><span className="font-medium text-slate-900">必填字段：</span>姓名 (name)、邮箱 (email)</p>
                <p><span className="font-medium text-slate-900">可选字段：</span>学号 (student_id)、角色 (role)、专业 (major)、密码 (password)</p>
                <p><span className="font-medium text-slate-900">默认值：</span>角色默认为 user，密码默认为 123456</p>
                <p><span className="font-medium text-slate-900">注意事项：</span>邮箱必须唯一，重复邮箱将被跳过</p>
              </div>
            </div>
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
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'users'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="material-symbols-outlined">group</span>
            用户管理
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
                 activeTab === 'lost-found' ? '失物招领管理' :
                 activeTab === 'users' ? '用户管理' : '管理后台'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {activeTab === 'overview' ? '查看平台运营数据统计' :
                 activeTab === 'notifications' ? `共 ${notifications.length} 条通知` :
                 activeTab === 'activities' ? `共 ${activities.length} 个活动` :
                 activeTab === 'lost-found' ? `共 ${lostItems.length} 条失物招领` :
                 '用户管理与批量操作'}
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

      {/* Registrations Modal */}
      {registrationsModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closeRegistrationsModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-900">报名名单</h3>
                <p className="text-sm text-slate-500">{registrationsModal.activityName}</p>
              </div>
              <button onClick={closeRegistrationsModal} className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6">
              {isLoadingRegistrations ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="inline-block size-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-500 font-medium">加载中...</p>
                  </div>
                </div>
              ) : registrations.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-5xl text-slate-300">group_off</span>
                  <p className="mt-3 text-slate-500 font-medium">暂无报名</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-slate-500">共 {registrationsTotal} 人报名</p>
                  </div>

                  {/* Registrations Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">姓名</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">学号</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">联系电话</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">备注</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">报名时间</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">状态</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {registrations.map((reg) => (
                          <tr key={reg.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm font-medium text-slate-900">{reg.name}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{reg.student_id}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{reg.phone || '-'}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{reg.remark || '-'}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {new Date(reg.created_at).toLocaleString('zh-CN')}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${
                                reg.status === 'confirmed'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : reg.status === 'cancelled'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {reg.status === 'confirmed' ? '已确认' : reg.status === 'cancelled' ? '已取消' : reg.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={closeRegistrationsModal}
                className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
