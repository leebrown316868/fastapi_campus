import { apiClient } from './api';

export interface FeedItem {
  id: string;
  type: 'notification' | 'activity' | 'lost_item';
  tag: string;
  tag_color: string;
  title: string;
  description: string;
  time: string;
  created_at: string;
  link_url: string;
}

export interface FeedResponse {
  items: FeedItem[];
  total: number;
}

class FeedService {
  private baseUrl = '/api/feed';

  async getLatest(limit: number = 10): Promise<FeedResponse> {
    return apiClient.get(`${this.baseUrl}/latest?limit=${limit}`);
  }
}

export default new FeedService();
