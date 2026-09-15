export interface User {
  id: string
  username: string
  email?: string
  firstName?: string
  lastName?: string
  bio?: string
  affiliation?: string
  avatar?: string
  bannerUrl?: string
  role?: 'USER' | 'MODERATOR' | 'ADMIN' | 'ANALYTICS'
  displayName?: string
  points?: number
  level?: number
  loginStreak?: number
  lastStreakDate?: string
  badges?: string[]
  followersCount?: number
  followingCount?: number
  isVerified?: boolean
  onboardingCompleted?: boolean
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
  communityId?: string | null
  content: string
  imageUrls: string[]
  videoUrls: string[]
  isAnonymous: boolean
  likesCount: number
  commentsCount: number
  viewsCount: number
  status: string
  poll?: unknown
  isLiked?: boolean
  createdAt: string
  updatedAt: string
  author: {
    id: string
    username: string
    displayName?: string | null
    avatar?: string
    level?: number
  }
}

export interface Comment {
  id: string
  authorId: string
  postId: string
  parentId?: string | null
  content: string
  likesCount: number
  repliesCount?: number
  isLiked?: boolean
  createdAt: string
  author: {
    id: string
    username: string
    displayName?: string | null
    avatar?: string
    level?: number
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
    displayName?: string | null
    avatar?: string
    level?: number
  }
}

export interface Conversation {
  id: string
  lastMessageAt: string
  otherUser?: {
    id: string
    username: string
    displayName?: string | null
    avatar?: string
    online?: boolean
  }
  lastMessage?: Message | null
  unreadCount: number
}

export interface MessageReaction {
  userId: string
  emoji: string
  createdAt: string
  user?: {
    id: string
    username: string
    displayName?: string | null
    avatar?: string
  }
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  receiverId: string
  content: string
  read: boolean
  createdAt: string
  reactions?: MessageReaction[]
  sender?: {
    id: string
    username: string
    displayName?: string | null
    avatar?: string
  }
  receiver?: {
    id: string
    username: string
    displayName?: string | null
    avatar?: string
  }
}

export interface PageResult<T> {
  items: T[]
  page: number
  lastPage: number
  total?: number
}

export interface MessagePage {
  messages: Message[]
  nextCursor: string | null
}

export interface NotificationPage {
  notifications: Notification[]
  unreadCount: number
}

export interface PrivacySettings {
  profileVisibility: 'PUBLIC' | 'PRIVATE'
  whoCanMessage: 'EVERYONE' | 'FOLLOWERS' | 'NOBODY'
  showEmail: boolean
  showBirthday: boolean
  allowMentions: boolean
  showActivityStatus: boolean
  allowSearchEngineIndexing: boolean
}

export interface NotificationSettings {
  emailOnNewFollower: boolean
  emailOnMention: boolean
  emailOnLike: boolean
  emailOnComment: boolean
  emailOnMessage: boolean
  emailDigestFrequency: 'INSTANT' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'NEVER'
  pushOnNewFollower: boolean
  pushOnMention: boolean
  pushOnLike: boolean
  pushOnComment: boolean
  pushOnMessage: boolean
  weeklyDigest: boolean
}

export interface TrendingData {
  trendingPosts: Post[]
  trendingTopics: Array<{ tag: string; posts: number; growth?: string }>
  risingUsers: User[]
  stats?: Record<string, unknown>
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}
