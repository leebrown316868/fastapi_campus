import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { notificationsService } from '../services/notifications.service';
import { activitiesService } from '../services/activities.service';
import { lostItemsService } from '../services/lostItems.service';
import { showToast } from '../components/Toast';

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

  // 课程通知表单状态
  const [courseForm, setCourseForm] = useState({
    course: '',
    title: '',
    content: '',
  });

  // 活动公告表单状态
  const [activityForm, setActivityForm] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
    category: 'lecture',
    status: 'upcoming',
    organizer: user?.name || 'Admin',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
  });

  // 失物招领表单状态
  const [lostForm, setLostForm] = useState({
    title: '',
    type: 'lost' as 'lost' | 'found',
    category: 'electronics',
    description: '',
    location: '',
    time: '',
  });

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
          await notificationsService.create({
            course: courseForm.course,
            title: courseForm.title,
            content: courseForm.content,
            author: user.name,
          });
          showToast('课程通知发布成功！', 'success');
          navigate('/notifications');
          break;

        case 'activity':
          // 验证活动公告表单
          if (!activityForm.title.trim() || !activityForm.description.trim() ||
              !activityForm.date || !activityForm.location.trim()) {
            showToast('请填写所有必填项', 'error');
            return;
          }
          await activitiesService.create(activityForm);
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

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-900">课程资料/附件</label>
              <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl bg-white/30 hover:bg-white/50 hover:border-primary/50 transition-all cursor-pointer">
                <span className="material-symbols-outlined text-primary mb-1">attach_file</span>
                <p className="text-xs font-bold text-slate-600">点击上传 PDF、PPT 或 Word 文档</p>
                <p className="text-[10px] text-slate-400 mt-1">单个文件不超过 20MB</p>
              </div>
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
                <label className="block text-sm font-bold text-slate-900">活动地点 <span className="text-red-500">*</span></label>
                <input
                  className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900 placeholder-slate-400"
                  placeholder="例如：学生活动中心广场"
                  type="text"
                  value={activityForm.location}
                  onChange={(e) => setActivityForm({ ...activityForm, location: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">日期 <span className="text-red-500">*</span></label>
                <input
                  className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900"
                  type="date"
                  value={activityForm.date}
                  onChange={(e) => setActivityForm({ ...activityForm, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">活动类别</label>
                <div className="relative">
                  <select
                    className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900 appearance-none cursor-pointer"
                    value={activityForm.category}
                    onChange={(e) => setActivityForm({ ...activityForm, category: e.target.value })}
                  >
                    <option value="lecture">讲座</option>
                    <option value="competition">竞赛</option>
                    <option value="performance">演出</option>
                    <option value="sports">体育</option>
                    <option value="other">其他</option>
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                    <span className="material-symbols-outlined">expand_more</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">人数上限</label>
                <input
                  className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900"
                  placeholder="不限"
                  type="number"
                />
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
              <label className="block text-sm font-bold text-slate-900">宣传海报</label>
              <div className="relative group cursor-pointer h-40 border-2 border-dashed border-slate-300 rounded-xl bg-white/30 flex flex-col items-center justify-center hover:bg-white/50 hover:border-emerald-500/50 transition-all">
                <span className="material-symbols-outlined text-emerald-500 mb-2">image</span>
                <p className="text-xs font-bold text-slate-600">点击或拖拽上传活动海报</p>
              </div>
            </div>
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

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-900">上传实物照片</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="aspect-square border-2 border-dashed border-slate-300 rounded-xl bg-white/30 flex flex-col items-center justify-center hover:bg-white/50 hover:border-orange-500/50 transition-all cursor-pointer">
                  <span className="material-symbols-outlined text-orange-500">add_a_photo</span>
                  <span className="text-[10px] font-bold text-slate-500 mt-1">上传照片</span>
                </div>
                <div className="aspect-square bg-slate-100/50 rounded-xl border border-slate-200 flex items-center justify-center text-slate-300 italic text-[10px]">待添加</div>
                <div className="aspect-square bg-slate-100/50 rounded-xl border border-slate-200 flex items-center justify-center text-slate-300 italic text-[10px]">待添加</div>
                <div className="aspect-square bg-slate-100/50 rounded-xl border border-slate-200 flex items-center justify-center text-slate-300 italic text-[10px]">待添加</div>
              </div>
            </div>
          </div>
        );
    }
  };

  const isAdmin = user.role === 'admin';

  return (
    <main className="flex-1 px-4 pb-12 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full pt-8">
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
                disabled={isSubmitting}
              >
                <span className="material-symbols-outlined text-xl">{isSubmitting ? 'hourglass_empty' : 'send'}</span>
                {isSubmitting ? '提交中...' : '提交审核并发布'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
};

export default Publish;