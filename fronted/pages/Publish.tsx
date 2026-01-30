import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { notificationsService } from '../services/notifications.service';
import { activitiesService } from '../services/activities.service';
import { lostItemsService } from '../services/lostItems.service';
import { showToast } from '../components/Toast';
import ImageUpload from '../components/ImageUpload';
import MultiImageUpload from '../components/MultiImageUpload';
import DottedBackground from '../components/DottedBackground';

type Category = 'course' | 'activity' | 'lost';

const Publish: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const [category, setCategory] = useState<Category>(() => {
    // 从 URL 参数获取初始类型，普通用户固定为 lost
    if (user?.role !== 'admin') return 'lost';
    if (params.type === 'lost-found') return 'lost';
    return 'activity';
  });
  const [isFound, setIsFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  // 课程通知表单状态
  const [courseForm, setCourseForm] = useState({
    course: '',
    title: '',
    content: '',
    location: '',
    is_important: false,
  });

  // 附件上传状态
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 活动公告表单状态
  const [activityForm, setActivityForm] = useState({
    title: '',
    description: '',
    location: '',
    category: '学术讲座',
    organizer: '',
    notes: '',
    image: '',
    capacity: 0,
    // Whether registration is required
    hasRegistration: false,
    // Time fields
    registration_start: '',
    registration_end: '',
    activity_start: '',
    activity_end: '',
    // Legacy display date (will be auto-generated)
    date: '',
  });

  // 活动类别选项
  const activityCategories = [
    '学术讲座',
    '文艺演出',
    '体育赛事',
    '社团活动',
    '志愿服务',
    '就业招聘',
  ];

  // 活动地点选项
  const activityLocations = [
    '图书馆报告厅',
    '学生活动中心',
    '体育馆',
    '教学楼A101',
    '大礼堂',
    '操场',
    '创业园',
  ];

  // Time validation errors
  const [timeErrors, setTimeErrors] = useState({
    registration: '',
    activity: '',
  });

  // 失物招领表单状态
  const [lostForm, setLostForm] = useState({
    title: '',
    type: 'lost' as 'lost' | 'found',
    category: 'electronics',
    description: '',
    location: '',
    time: '',
    images: [] as string[],
  });

  // 失物招领类别定义
  const lostItemCategories = [
    { value: 'electronics', label: '电子数码', icon: 'devices', color: 'blue' },
    { value: 'cards', label: '证件卡片', icon: 'badge', color: 'purple' },
    { value: 'books', label: '书籍文具', icon: 'menu_book', color: 'green' },
    { value: 'daily', label: '生活用品', icon: 'coffee', color: 'amber' },
    { value: 'clothing', label: '服饰配件', icon: 'checkroom', color: 'pink' },
    { value: 'sports', label: '运动器材', icon: 'sports_basketball', color: 'red' },
    { value: 'keys', label: '钥匙', icon: 'key', color: 'slate' },
    { value: 'other', label: '其他', icon: 'more_horiz', color: 'gray' },
  ];

  // 权限检查
  if (!user) {
    navigate('/login');
    return null;
  }

  // ⚠️ 安全警告：这只是前端 UI 控制，不是真正的权限验证！
  // 用户可以通过修改浏览器 localStorage 绕过此限制。
  // 真正的权限验证必须在后端 API 进行（TODO: 等后端开发时实现）
  const canPublishUI = (type: Category) => {
    if (user.role === 'admin') return true;
    return type === 'lost';
  };

  // 提交处理函数
  const handleSubmit = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      switch (category) {
        case 'course':
          // 验证课程通知表单
          if (!courseForm.course.trim() || !courseForm.title.trim() || !courseForm.content.trim()) {
            showToast('请填写所有必填项', 'error');
            return;
          }

          // Upload attachment if selected
          let attachmentUrl: string | undefined;
          let attachmentName: string | undefined;

          if (attachmentFile) {
            try {
              setIsUploading(true);
              const formData = new FormData();
              formData.append('file', attachmentFile);

              const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/upload/document`, {
                method: 'POST',
                body: formData,
              });

              if (!response.ok) {
                // Handle auth errors - trigger reload to let AuthContext handle redirect
                if (response.status === 401 || response.status === 403) {
                  window.location.href = '/';
                }
                const error = await response.json();
                throw new Error(error.detail || '上传失败');
              }

              const result = await response.json();
              attachmentUrl = result.url;
              attachmentName = result.original_filename;
            } catch (error) {
              console.error('File upload error:', error);
              showToast(`文件上传失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
              return;
            } finally {
              setIsUploading(false);
            }
          }

          await notificationsService.create({
            course: courseForm.course,
            title: courseForm.title,
            content: courseForm.content,
            location: courseForm.location || null,
            is_important: courseForm.is_important,
            author: user.name,
            avatar: user.avatar || null,
            attachment: attachmentUrl,
            attachment_name: attachmentName,
          });
          showToast('课程通知发布成功！', 'success');
          navigate('/notifications');
          break;

        case 'activity':
          // 验证活动公告表单
          if (!activityForm.title.trim() || !activityForm.description.trim() ||
              !activityForm.activity_start || !activityForm.location.trim() || !activityForm.organizer.trim()) {
            showToast('请填写所有必填项', 'error');
            return;
          }

          // Validate time fields
          const validationErrors = { registration: '', activity: '' };
          const now = new Date();
          const activityStart = new Date(activityForm.activity_start);
          const activityEnd = activityForm.activity_end ? new Date(activityForm.activity_end) : null;

          // Validate activity time
          if (activityEnd && activityEnd <= activityStart) {
            validationErrors.activity = '活动结束时间必须晚于活动开始时间';
          }

          // Validate registration time if enabled
          if (activityForm.hasRegistration) {
            if (!activityForm.registration_start || !activityForm.registration_end) {
              showToast('请填写完整的报名时间', 'error');
              return;
            }

            const registrationStart = new Date(activityForm.registration_start);
            const registrationEnd = new Date(activityForm.registration_end);

            if (registrationStart >= registrationEnd) {
              validationErrors.registration = '报名结束时间必须晚于报名开始时间';
            } else if (registrationEnd >= activityStart) {
              validationErrors.registration = '报名结束时间必须早于活动开始时间';
            }
          }

          setTimeErrors(validationErrors);

          if (validationErrors.registration || validationErrors.activity) {
            showToast('请修正时间设置错误', 'error');
            return;
          }

          // Generate display date from activity_start
          const generateDisplayDate = (dateStr: string) => {
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const hours = date.getHours();
            const minutes = date.getMinutes();
            return `${year}年${month}月${day}日 ${hours}:${minutes.toString().padStart(2, '0')}`;
          };

          // Prepare data for API
          const activityData = {
            title: activityForm.title,
            description: activityForm.description,
            location: activityForm.location,
            category: activityForm.category,
            organizer: activityForm.organizer,
            notes: activityForm.notes,
            image: activityForm.image,
            capacity: activityForm.capacity,
            date: generateDisplayDate(activityForm.activity_start),
            activity_start: activityForm.activity_start,
            activity_end: activityForm.activity_end || null,
            // Only include registration fields if registration is enabled
            registration_start: activityForm.hasRegistration ? activityForm.registration_start : null,
            registration_end: activityForm.hasRegistration ? activityForm.registration_end : null,
          };

          await activitiesService.create(activityData);
          showToast('活动公告发布成功！', 'success');
          navigate('/activities');
          break;

        case 'lost':
          // 验证失物招领表单
          if (!lostForm.title.trim() || !lostForm.description.trim() ||
              !lostForm.location.trim() || !lostForm.time) {
            showToast('请填写所有必填项', 'error');
            return;
          }
          await lostItemsService.create({
            ...lostForm,
            type: isFound ? 'found' : 'lost',
          });
          showToast('失物招领信息发布成功！', 'success');
          navigate('/lost-and-found');
          break;
      }
    } catch (error: any) {
      console.error('Publish error:', error);
      showToast(error.response?.data?.detail || '发布失败，请稍后重试', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 渲染不同的详情表单
  const renderDetailForm = () => {
    switch (category) {
      case 'course':
        // UI 限制：非管理员不显示课程通知表单
        if (!canPublishUI('course')) return null;
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">课程名称 <span className="text-red-500">*</span></label>
                <input
                  className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900 placeholder-slate-400"
                  placeholder="例如：高等数学 (上)"
                  type="text"
                  value={courseForm.course}
                  onChange={(e) => setCourseForm({ ...courseForm, course: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">通知标题 <span className="text-red-500">*</span></label>
                <input
                  className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900 placeholder-slate-400"
                  placeholder="例如：期中考试安排通知"
                  type="text"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-900">详细说明 <span className="text-red-500">*</span></label>
              <textarea
                className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary text-slate-900 placeholder-slate-400 resize-none min-h-[120px]"
                placeholder="请输入具体的变更内容或作业要求..."
                value={courseForm.content}
                onChange={(e) => setCourseForm({ ...courseForm, content: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">地点（可选）</label>
                <input
                  className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900 placeholder-slate-400"
                  placeholder="例如：主楼 304 教室"
                  type="text"
                  value={courseForm.location}
                  onChange={(e) => setCourseForm({ ...courseForm, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">重要程度</label>
                <label className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/50 border border-slate-200 cursor-pointer hover:bg-white/70 transition-all">
                  <input
                    type="checkbox"
                    checked={courseForm.is_important}
                    onChange={(e) => setCourseForm({ ...courseForm, is_important: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary/20"
                  />
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <span className="material-symbols-outlined text-red-500">priority_high</span>
                    标记为重要通知
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-900">课程资料/附件</label>
              <input
                type="file"
                accept=".pdf,.ppt,.pptx,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Check file size (20MB limit)
                    if (file.size > 20 * 1024 * 1024) {
                      showToast('文件大小超过 20MB', 'error');
                      return;
                    }
                    setAttachmentFile(file);
                  }
                }}
                className="hidden"
                id="attachment-upload"
              />
              <label
                htmlFor="attachment-upload"
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
                  attachmentFile
                    ? 'border-primary bg-primary/5 hover:bg-primary/10'
                    : 'border-slate-300 bg-white/30 hover:bg-white/50 hover:border-primary/50'
                }`}
              >
                {isUploading ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-primary border-t-transparent mb-2"></div>
                    <p className="text-xs font-bold text-slate-600">上传中...</p>
                  </>
                ) : attachmentFile ? (
                  <>
                    <span className="material-symbols-outlined text-primary mb-1">check_circle</span>
                    <p className="text-sm font-bold text-slate-900">{attachmentFile.name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {(attachmentFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setAttachmentFile(null);
                      }}
                      className="mt-2 text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      点击重新选择
                    </button>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-primary mb-1">attach_file</span>
                    <p className="text-xs font-bold text-slate-600">点击上传 PDF、PPT 或 Word 文档</p>
                    <p className="text-[10px] text-slate-400 mt-1">单个文件不超过 20MB</p>
                  </>
                )}
              </label>
            </div>
          </div>
        );

      case 'activity':
        // UI 限制：非管理员不显示活动公告表单
        if (!canPublishUI('activity')) return null;
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">活动标题 <span className="text-red-500">*</span></label>
                <input
                  className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900 placeholder-slate-400"
                  placeholder="例如：2023 校园草坪音乐节"
                  type="text"
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">主办方 <span className="text-red-500">*</span></label>
                <input
                  className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900 placeholder-slate-400"
                  placeholder="例如：学生会、团委、文艺部等"
                  type="text"
                  value={activityForm.organizer}
                  onChange={(e) => setActivityForm({ ...activityForm, organizer: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">活动类别</label>
                <div className="relative">
                  <select
                    className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900 appearance-none cursor-pointer"
                    value={activityForm.category}
                    onChange={(e) => setActivityForm({ ...activityForm, category: e.target.value })}
                  >
                    {activityCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                    <span className="material-symbols-outlined">expand_more</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">活动地点 <span className="text-red-500">*</span></label>
                <input
                  className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900 placeholder-slate-400"
                  placeholder="例如：图书馆三楼报告厅、学生活动中心大礼堂等"
                  type="text"
                  value={activityForm.location}
                  onChange={(e) => setActivityForm({ ...activityForm, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">人数上限</label>
                <input
                  className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900"
                  placeholder="0 表示不限"
                  type="number"
                  min="0"
                  value={activityForm.capacity || ''}
                  onChange={(e) => setActivityForm({ ...activityForm, capacity: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Time Settings Section */}
            <div className="bg-emerald-50/50 rounded-2xl p-6 border border-emerald-100">
              <h4 className="text-sm font-bold text-emerald-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600">schedule</span>
                时间设置
              </h4>

              {/* Registration Toggle */}
              <div className="flex items-center justify-between mb-6 p-4 bg-white/60 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-slate-900">需要报名</p>
                  <p className="text-xs text-slate-500">开启后用户可报名参加活动</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newValue = !activityForm.hasRegistration;
                    setActivityForm({
                      ...activityForm,
                      hasRegistration: newValue,
                      // Clear registration times when turning off
                      registration_start: newValue ? activityForm.registration_start : '',
                      registration_end: newValue ? activityForm.registration_end : '',
                    });
                    setTimeErrors({ ...timeErrors, registration: '' });
                  }}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                    activityForm.hasRegistration ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                      activityForm.hasRegistration ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-6">
                {/* 报名时间 - only shown when hasRegistration is true */}
                {activityForm.hasRegistration && (
                  <div className={`animate-fade-in ${timeErrors.registration ? 'bg-red-50/50 -mx-2 px-2 py-2 -my-2 rounded-xl' : ''}`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-slate-600">报名时间</p>
                      {timeErrors.registration && (
                        <p className="text-xs font-bold text-red-600 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">error</span>
                          {timeErrors.registration}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">报名开始</label>
                        <input
                          className={`w-full px-3 py-2.5 rounded-lg bg-white/70 border outline-none focus:ring-2 transition-all text-sm text-slate-900 ${
                            timeErrors.registration
                              ? 'border-red-300 focus:ring-red-500/10 focus:border-red-500'
                              : 'border-slate-200 focus:ring-emerald-500/10 focus:border-emerald-500'
                          }`}
                          type="datetime-local"
                          value={activityForm.registration_start}
                          onChange={(e) => {
                            setActivityForm({ ...activityForm, registration_start: e.target.value });
                            setTimeErrors({ ...timeErrors, registration: '' });
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">报名结束</label>
                        <input
                          className={`w-full px-3 py-2.5 rounded-lg bg-white/70 border outline-none focus:ring-2 transition-all text-sm text-slate-900 ${
                            timeErrors.registration
                              ? 'border-red-300 focus:ring-red-500/10 focus:border-red-500'
                              : 'border-slate-200 focus:ring-emerald-500/10 focus:border-emerald-500'
                          }`}
                          type="datetime-local"
                          value={activityForm.registration_end}
                          onChange={(e) => {
                            setActivityForm({ ...activityForm, registration_end: e.target.value });
                            setTimeErrors({ ...timeErrors, registration: '' });
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">
                      报名结束时间必须早于活动开始时间
                    </p>
                  </div>
                )}

                {/* 活动时间 */}
                <div className={timeErrors.activity ? 'bg-red-50/50 -mx-2 px-2 py-2 -my-2 rounded-xl' : ''}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-slate-600">活动时间 <span className="text-red-500">*</span></p>
                    {timeErrors.activity && (
                      <p className="text-xs font-bold text-red-600 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">error</span>
                        {timeErrors.activity}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">活动开始 <span className="text-red-500">*</span></label>
                      <input
                        className={`w-full px-3 py-2.5 rounded-lg bg-white/70 border outline-none focus:ring-2 transition-all text-sm text-slate-900 ${
                          timeErrors.activity
                            ? 'border-red-300 focus:ring-red-500/10 focus:border-red-500'
                            : 'border-emerald-300 focus:ring-emerald-500/10 focus:border-emerald-500'
                        }`}
                        type="datetime-local"
                        value={activityForm.activity_start}
                        onChange={(e) => {
                          setActivityForm({ ...activityForm, activity_start: e.target.value });
                          setTimeErrors({ ...timeErrors, activity: '' });
                        }}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">活动结束</label>
                      <input
                        className={`w-full px-3 py-2.5 rounded-lg bg-white/70 border outline-none focus:ring-2 transition-all text-sm text-slate-900 ${
                          timeErrors.activity
                            ? 'border-red-300 focus:ring-red-500/10 focus:border-red-500'
                            : 'border-slate-200 focus:ring-emerald-500/10 focus:border-emerald-500'
                        }`}
                        type="datetime-local"
                        value={activityForm.activity_end}
                        onChange={(e) => {
                          setActivityForm({ ...activityForm, activity_end: e.target.value });
                          setTimeErrors({ ...timeErrors, activity: '' });
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Preview */}
              <div className="mt-4 pt-4 border-t border-emerald-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">预计状态</span>
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                    {!activityForm.hasRegistration
                      ? '公示活动（无需报名）'
                      : activityForm.registration_start && new Date(activityForm.registration_start) > new Date()
                        ? '即将开始报名'
                        : activityForm.activity_start
                          ? new Date(activityForm.activity_start) > new Date()
                            ? '报名中'
                            : '进行中'
                          : '报名中'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-900">活动简介 <span className="text-red-500">*</span></label>
              <textarea
                className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary text-slate-900 placeholder-slate-400 resize-none min-h-[120px]"
                placeholder="详细介绍活动的流程、嘉宾、报名方式等信息..."
                value={activityForm.description}
                onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-900">注意事项</label>
              <textarea
                className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary text-slate-900 placeholder-slate-400 resize-none min-h-[80px]"
                placeholder="例如：请提前15分钟入场、活动期间请保持安静、禁止携带食物饮料等..."
                value={activityForm.notes}
                onChange={(e) => setActivityForm({ ...activityForm, notes: e.target.value })}
              />
              <p className="text-xs text-slate-400">选填，用于提示参与者需要注意的事项</p>
            </div>

            <ImageUpload
              label="宣传海报"
              value={activityForm.image}
              onChange={(url) => setActivityForm({ ...activityForm, image: url || '' })}
              theme="emerald"
            />
          </div>
        );

      case 'lost':
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-1/3 space-y-2">
                <label className="block text-sm font-bold text-slate-900">信息类型 <span className="text-red-500">*</span></label>
                <div className="flex bg-white/50 border border-slate-200 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setIsFound(false)}
                    className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${!isFound ? 'bg-red-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    遗失寻物
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFound(true)}
                    className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${isFound ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    捡到招领
                  </button>
                </div>
              </div>
              <div className="flex-grow space-y-2">
                <label className="block text-sm font-bold text-slate-900">物品名称 <span className="text-red-500">*</span></label>
                <input
                  className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900 placeholder-slate-400"
                  placeholder="例如：蓝色 AirPods Pro 保护壳"
                  type="text"
                  value={lostForm.title}
                  onChange={(e) => setLostForm({ ...lostForm, title: e.target.value })}
                />
              </div>
            </div>

            {/* 物品类别选择 */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-900">物品类别 <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {lostItemCategories.map((cat) => {
                  const colorClasses = {
                    blue: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100',
                    purple: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100',
                    green: 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100',
                    amber: 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100',
                    pink: 'bg-pink-50 text-pink-600 border-pink-200 hover:bg-pink-100',
                    red: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100',
                    slate: 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100',
                    gray: 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100',
                  };
                  const isSelected = lostForm.category === cat.value;

                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setLostForm({ ...lostForm, category: cat.value })}
                      className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-bold text-xs ${
                        isSelected
                          ? colorClasses[cat.color as keyof typeof colorClasses].replace(' hover:bg-', '').replace('/50', '/100')
                          : 'bg-white/50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-2xl ${isSelected ? '' : 'text-slate-400'}`}>
                        {cat.icon}
                      </span>
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">发现/遗失地点 <span className="text-red-500">*</span></label>
                <input
                  className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900 placeholder-slate-400"
                  placeholder="例如：图书馆三楼自习区"
                  type="text"
                  value={lostForm.location}
                  onChange={(e) => setLostForm({ ...lostForm, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">大概时间 <span className="text-red-500">*</span></label>
                <input
                  className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900"
                  type="datetime-local"
                  value={lostForm.time}
                  onChange={(e) => setLostForm({ ...lostForm, time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-900">详细特征说明 <span className="text-red-500">*</span></label>
              <textarea
                className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary text-slate-900 placeholder-slate-400 resize-none min-h-[120px]"
                placeholder="请描述物品的品牌、颜色、外壳图案、破损情况等特征，有助于物主认领..."
                value={lostForm.description}
                onChange={(e) => setLostForm({ ...lostForm, description: e.target.value })}
              />
            </div>

            <MultiImageUpload
              label="上传实物照片"
              value={lostForm.images}
              onChange={(urls) => setLostForm({ ...lostForm, images: urls })}
              maxImages={4}
            />
          </div>
        );
    }
  };

  const isAdmin = user.role === 'admin';

  return (
    <div className="relative min-h-screen">
      {/* Dynamic Dotted Background */}
      <DottedBackground />

      <main className={`relative z-10 flex-1 px-4 pb-12 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full pt-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {/* 面包屑导航 */}
      <div className="flex items-center gap-2 mb-6 text-sm font-medium text-slate-500">
        <span className="hover:text-primary transition-colors cursor-pointer" onClick={() => navigate('/')}>首页</span>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <span className="text-slate-900 font-bold">{isAdmin ? '发布信息' : '发布失物招领'}</span>
      </div>

      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
          {isAdmin ? '发布新信息' : '发布失物招领'}
        </h1>
        <p className="text-lg text-slate-600 font-medium">
          {isAdmin
            ? '向校园社区分享最新动态、活动或失物招领信息。'
            : '寻找丢失的物品或发布捡到的物品信息。'}
        </p>
      </div>

      {/* 管理员：显示分类选择 */}
      {isAdmin && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">1. 选择发布分类</h3>
            <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
              当前选择: {category === 'course' ? '课程动态' : category === 'activity' ? '校园活动' : '失物招领'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => setCategory('course')}
              className={`glass-card group relative p-6 rounded-2xl flex flex-col items-start text-left cursor-pointer h-full border-2 transition-all ${category === 'course' ? 'border-primary ring-4 ring-primary/5 bg-white/90 translate-y-[-4px]' : 'border-white/50'}`}
            >
              <div className={`size-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 ${category === 'course' ? 'bg-primary text-white scale-110 shadow-lg' : 'bg-blue-50 text-blue-600 group-hover:scale-110'}`}>
                <span className="material-symbols-outlined text-3xl">book_2</span>
              </div>
              {category === 'course' && <div className="absolute top-4 right-4 text-primary animate-fade-in"><span className="material-symbols-outlined fill-current">check_circle</span></div>}
              <h4 className="text-lg font-bold text-slate-900 mb-1">课程动态</h4>
              <p className="text-sm text-slate-600">发布调课通知、作业、考试安排及相关学习资料。</p>
            </button>

            <button
              onClick={() => setCategory('activity')}
              className={`glass-card group relative p-6 rounded-2xl flex flex-col items-start text-left cursor-pointer h-full border-2 transition-all ${category === 'activity' ? 'border-primary ring-4 ring-primary/5 bg-white/90 translate-y-[-4px]' : 'border-white/50'}`}
            >
              <div className={`size-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 ${category === 'activity' ? 'bg-primary text-white scale-110 shadow-lg' : 'bg-emerald-50 text-emerald-600 group-hover:scale-110'}`}>
                <span className="material-symbols-outlined text-3xl">campaign</span>
              </div>
              {category === 'activity' && <div className="absolute top-4 right-4 text-primary animate-fade-in"><span className="material-symbols-outlined fill-current">check_circle</span></div>}
              <h4 className="text-lg font-bold text-slate-900 mb-1">校园活动</h4>
              <p className="text-sm text-slate-600">发布社团招新、讲座通知、文体竞赛及演出。</p>
            </button>

            <button
              onClick={() => setCategory('lost')}
              className={`glass-card group relative p-6 rounded-2xl flex flex-col items-start text-left cursor-pointer h-full border-2 transition-all ${category === 'lost' ? 'border-primary ring-4 ring-primary/5 bg-white/90 translate-y-[-4px]' : 'border-white/50'}`}
            >
              <div className={`size-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 ${category === 'lost' ? 'bg-primary text-white scale-110 shadow-lg' : 'bg-orange-50 text-orange-600 group-hover:scale-110'}`}>
                <span className="material-symbols-outlined text-3xl">search</span>
              </div>
              {category === 'lost' && <div className="absolute top-4 right-4 text-primary animate-fade-in"><span className="material-symbols-outlined fill-current">check_circle</span></div>}
              <h4 className="text-lg font-bold text-slate-900 mb-1">失物招领</h4>
              <p className="text-sm text-slate-600">寻找丢失的物品或发布捡到的物品信息及招领地点。</p>
            </button>
          </div>
        </section>
      )}

      {/* 步骤 2：发布详情 */}
      <section className="transition-all duration-500">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">
            {isAdmin ? '2. 完善发布详情' : '1. 完善发布详情'}
          </h3>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">请确保信息真实有效</span>
        </div>
        <div className="glass-panel p-8 rounded-[2.5rem] shadow-xl border border-white/60">
          <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
            {renderDetailForm()}

            <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-8 mt-4 border-t border-slate-200/40">
              <button className="w-full sm:w-auto px-8 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-black/5 transition-colors" type="button">
                存为草稿
              </button>
              <button
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-4 rounded-2xl text-white font-black text-sm shadow-lg transform active:scale-95 transition-all ${category === 'course' ? 'bg-primary shadow-primary/30 hover:shadow-primary/50' :
                  category === 'activity' ? 'bg-emerald-500 shadow-emerald-500/30 hover:shadow-emerald-600/50' :
                    'bg-indigo-500 shadow-indigo-500/30 hover:shadow-indigo-600/50'
                }`}
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || isUploading}
              >
                <span className="material-symbols-outlined text-xl">{isSubmitting || isUploading ? 'hourglass_empty' : 'send'}</span>
                {isSubmitting || isUploading ? (isUploading ? '上传中...' : '提交中...') : '提交审核并发布'}
              </button>
            </div>
          </form>
        </div>
      </section>
      </main>
    </div>
  );
};

export default Publish;