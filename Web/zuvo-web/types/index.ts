// ─── User ────────────────────────────────────────────────────
export interface User {
  _id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  role: "user" | "admin";
  followersCount: number;
  followingCount: number;
  createdAt: string;
}

// ─── Auth ────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  username: string;
  email: string;
  password: string;
}

// ─── Post / Blog ─────────────────────────────────────────────
export interface Post {
  _id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  image?: string;
  tags: string[];
  author: User;
  status: "draft" | "published";
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Comment ─────────────────────────────────────────────────
export interface Comment {
  _id: string;
  content: string;
  author: User;
  postId: string;
  createdAt: string;
}

// ─── Chat ────────────────────────────────────────────────────
export interface Conversation {
  _id: string;
  participants: User[];
  lastMessage?: Message;
  updatedAt: string;
}

export interface Message {
  _id?: string;
  conversationId: string;
  sender: string | User;
  content: string;
  attachments?: string[];
  timestamp: string;
}

// ─── Notification ────────────────────────────────────────────
export interface Notification {
  userId: string;
  type: "like" | "comment" | "follow" | "message";
  content: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

// ─── API Response Wrapper ────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}
