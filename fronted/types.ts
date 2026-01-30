
export interface NavItem {
  label: string;
  path: string;
  icon: string;
}

export interface NewsItem {
  id: string;
  tag: string;
  tagColor: string;
  time: string;
  title: string;
  description: string;
  author: {
    name: string;
    avatar: string;
  };
}

export interface Notification {
  id: string;
  course: string;
  isImportant: boolean;
  time: string;
  title: string;
  content: string;
  author: string;
  avatar: string;
  location: string;
}

export interface LostItem {
  id: string;
  type: 'lost' | 'found';
  category: string;
  title: string;
  time: string;
  location: string;
  description: string;
  images: string[];
  tags: string[];
  publisher: {
    id: number;
    name?: string | null;
    avatar?: string | null;
    email?: string | null;
    phone?: string | null;
  };
}

export interface User {
  id: string;
  studentId: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'publisher';
  avatar?: string;
  major?: string;
  bio?: string;
  phone?: string;
  isVerified?: boolean;
  // Privacy settings
  showNameInLostItem?: boolean;
  showAvatarInLostItem?: boolean;
  showEmailInLostItem?: boolean;
  showPhoneInLostItem?: boolean;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, isAdmin: boolean) => Promise<void>;
  logout: (redirectTo?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading?: boolean;
}