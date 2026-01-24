
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MOCK_ACTIVITIES, MOCK_LOST_ITEMS, MOCK_NEWS } from '../constants';

type ContentType = 'news' | 'activity' | 'lost';

const EditContent: React.FC = () => {
  const { type, id } = useParams<{ type: ContentType; id: string }>();
  const navigate = useNavigate();
  const [isFound, setIsFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  // 模拟数据预填充状态 (在真实应用中会从 API 获取)
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // 模拟数据获取
    setLoading(true);
    setTimeout(() => {
      let foundItem = null;
      if (type === 'activity') {
        foundItem = MOCK_ACTIVITIES.find(i => i.id === id);
      } else if (type === 'lost') {
        foundItem = MOCK_LOST_ITEMS.find(i => i.id === id);
        setIsFound(foundItem?.type === 'found');
      } else if (type === 'news') {
        foundItem = MOCK_NEWS.find(i => i.id === id);
      }
      setData(foundItem);
      setLoading(false);
    }, 500);
  }, [type, id]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setTimeout(() => {
      setSaveLoading(false);
      navigate('/admin');
    }, 1000);
  };

  const renderForm = () => {
    if (!data) return <div className="p-10 text-center text-slate-500">内容加载失败</div>;

    switch (type) {
      case 'news':
        return (
          <div className="space-y-8 animate-fade-in">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">动态标题 <span className="text-red-500">*</span></label>
                <input defaultValue={data.title} className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900" type="text" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">标签分类 <span className="text-red-500">*</span></label>
                <input defaultValue={data.tag} className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900" type="text" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-900">正文内容 <span className="text-red-500">*</span></label>
              <textarea defaultValue={data.description} className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary text-slate-900 min-h-[150px]"></textarea>
            </div>
          </div>
        );

      case 'activity':
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">活动标题 <span className="text-red-500">*</span></label>
                <input defaultValue={data.title} className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900" type="text" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">活动地点 <span className="text-red-500">*</span></label>
                <input defaultValue={data.location} className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900" type="text" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">状态 <span className="text-red-500">*</span></label>
                <select defaultValue={data.status} className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10">
                  <option>报名中</option>
                  <option>进行中</option>
                  <option>已结束</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">分类</label>
                <input defaultValue={data.category} className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10" type="text" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">日期描述</label>
                <input defaultValue={data.date} className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10" type="text" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-900">活动简介</label>
              <textarea defaultValue={data.description} className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 text-slate-900 min-h-[120px]"></textarea>
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
                  <button type="button" onClick={() => setIsFound(false)} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${!isFound ? 'bg-red-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>遗失寻物</button>
                  <button type="button" onClick={() => setIsFound(true)} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${isFound ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>捡到招领</button>
                </div>
              </div>
              <div className="flex-grow space-y-2">
                <label className="block text-sm font-bold text-slate-900">物品名称 <span className="text-red-500">*</span></label>
                <input defaultValue={data.title} className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 transition-all" type="text" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">地点 <span className="text-red-500">*</span></label>
                <input defaultValue={data.location} className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 transition-all" type="text" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-900">分类</label>
                <input defaultValue={data.category} className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10" type="text" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-900">详细描述</label>
              <textarea defaultValue={data.description} className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 text-slate-900 min-h-[120px]"></textarea>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        <p className="text-slate-500 font-bold">加载内容中...</p>
      </div>
    );
  }

  return (
    <main className="flex-1 px-4 pb-12 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full pt-8">
      <div className="flex items-center gap-2 mb-6 text-sm font-medium text-slate-500">
        <Link className="hover:text-primary transition-colors" to="/admin">管理后台</Link>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <span className="text-slate-900 font-bold">编辑项目</span>
      </div>

      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">编辑现有内容</h1>
          <p className="text-lg text-slate-600 font-medium">修改已发布的项目详情，系统将自动同步更新。</p>
        </div>
        <div className={`px-4 py-2 rounded-2xl border flex items-center gap-2 font-bold text-sm ${
          type === 'activity' ? 'bg-blue-50 border-blue-100 text-blue-600' : 
          type === 'news' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 
          'bg-orange-50 border-orange-100 text-orange-600'
        }`}>
          <span className="material-symbols-outlined text-lg">
            {type === 'activity' ? 'campaign' : type === 'news' ? 'newspaper' : 'search'}
          </span>
          {type === 'activity' ? '校园活动' : type === 'news' ? '最新动态' : '失物招领'}
        </div>
      </div>

      <div className="glass-panel p-8 rounded-[2.5rem] shadow-xl border border-white/60 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>
        
        <form onSubmit={handleSave} className="relative z-10">
          {renderForm()}

          <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-8 mt-10 border-t border-slate-200/40">
            <Link to="/admin" className="w-full sm:w-auto px-8 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-black/5 transition-colors text-center">
              放弃修改
            </Link>
            <button 
              type="submit" 
              disabled={saveLoading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-12 py-4 rounded-2xl bg-primary text-white font-black text-sm shadow-lg shadow-primary/30 hover:shadow-primary/50 transform active:scale-95 transition-all"
            >
              {saveLoading ? (
                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="material-symbols-outlined">save</span>
                  确认并保存更新
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};

export default EditContent;
