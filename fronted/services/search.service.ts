import { apiClient } from './api';

export interface SearchResultItem {
  id: number;
  type: 'notification' | 'activity' | 'lost_item';
  title: string;
  description: string;
  score: number;
  created_at?: string;
  extra: Record<string, any>;
}

export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  total: number;
  counts: {
    notifications: number;
    activities: number;
    lost_items: number;
  };
}

export const searchService = {
  /**
   * 统一全文搜索 - 后端 MySQL FULLTEXT 倒排索引
   */
  async search(query: string, type = 'all', limit = 20): Promise<SearchResponse> {
    return apiClient.getPublic<SearchResponse>(
      `/api/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`
    );
  },
};
