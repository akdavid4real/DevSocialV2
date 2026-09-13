export interface User {
  id: string
  username: string
  email: string
  firstName?: string
  lastName?: string
  bio?: string
  affiliation?: string
  avatar?: string
  bannerUrl?: string
  role: 'USER' | 'MODERATOR' | 'ADMIN' | 'ANALYTICS'
  displayName?: string
  points: number
  level: number
  loginStreak: number
  lastStreakDate?: string
  badges: string[]
  followersCount: number
  followingCount: number
  isVerified: boolean
  onboardingCompleted: boolean
  techStack?: string[]
  techCareerPath?: string
  experienceLevel?: string
  githubUsername?: string
  linkedinUrl?: string
  portfolioUrl?: string
  location?: string
  website?: string
  createdAt?: string
}

export interface Post {
  id: string
  authorId: string
  content: string
  imageUrls: string[]
  videoUrls: string[]
  isAnonymous: boolean
  likesCount: number
  commentsCount: number
  viewsCount: number
  status: string
  poll?: any
  isLiked?: boolean
  createdAt: string
  updatedAt: string
  author: {
    id: string
    username: string
    displayName?: string
    avatar?: string
    level: number
  }
}

export interface Comment {
  id: string
  authorId: string
  postId: string
  parentId?: string
  content: string
  likesCount: number
  isLiked?: boolean
  createdAt: string
  author: {
    id: string
    username: string
    displayName?: string
    avatar?: string
    level: number
  }
  replies?: Comment[]
  _count?: { replies: number }
}

export interface Notification {
  id: string
  recipientId: string
  senderId: string
  type: string
  title: string
  message: string
  relatedId?: string
  relatedType?: string
  read: boolean
  actionUrl?: string
  createdAt: string
  sender?: {
    id: string
    username: string
    displayName?: string
    avatar?: string
  }
}

export interface Conversation {
  id: string
  lastActivity: string
  otherUser?: {
    id: string
    username: string
    displayName?: string
    avatar?: string
  }
  lastMessage?: {
    content: string
    createdAt: string
    senderId: string
  }
  unreadCount: number
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  receiverId: string
  content: string
  read: boolean
  createdAt: string
  sender?: {
    id: string
    username: string
    displayName?: string
    avatar?: string
  }
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}
