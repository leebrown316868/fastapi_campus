import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { lostItemsService, MatchResult } from '../services/lostItems.service';

interface MatchedItemsProps {
  itemId: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  electronics: '电子数码',
  cards: '证件卡片',
  books: '书籍文具',
  daily: '生活用品',
  clothing: '服饰配件',
  sports: '运动器材',
  keys: '钥匙',
  other: '其他',
};

const MatchedItems: React.FC<MatchedItemsProps> = ({ itemId }) => {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const data = await lostItemsService.getMatches(itemId);
        setMatches(data);
      } catch (error) {
        console.error('Failed to fetch matches:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMatches();
  }, [itemId]);

  if (isLoading || matches.length === 0) return null;

  return (
    <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-5 border border-white/40 mb-6">
      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-orange-500">link</span>
        潜在匹配 ({matches.length})
      </h3>
      <div className="space-y-2">
        {matches.map((match) => (
          <Link
            key={match.id}
            to={`/lost-and-found/${match.id}`}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/60 border border-white/40 transition-all group"
          >
            {/* 类型图标 */}
            <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${
              match.type === 'found'
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-red-100 text-red-600'
            }`}>
              <span className="material-symbols-outlined text-lg">
                {match.type === 'found' ? 'found' : 'search'}
              </span>
            </div>

            {/* 信息 */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-primary transition-colors">
                {match.title}
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-xs">location_on</span>
                {match.location}
              </p>
            </div>

            {/* 分类标签 + 匹配度 */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {CATEGORY_LABELS[match.category] || match.category}
              </span>
              <div className={`text-xs font-bold px-2 py-1 rounded-full ${
                match.score >= 0.7
                  ? 'bg-emerald-100 text-emerald-700'
                  : match.score >= 0.4
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-600'
              }`}>
                {Math.round(match.score * 100)}%
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default MatchedItems;
