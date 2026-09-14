import axios, { AxiosError } from 'axios'
import * as SecureStore from 'expo-secure-store'
import { setRealtimeAccessToken } from './supabase'
import type {
  Comment,
  Conversation,
  Message,
  MessagePage,
  NotificationPage,
  NotificationSettings,
  Post,
  PrivacySettings,
  TrendingData,
  User,
} from './types'

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '')

if (!configuredApiUrl && !__DEV__) {
  throw new Error('EXPO_PUBLIC_API_URL must be configured for non-development builds')
}

export const API_BASE_URL = configuredApiUrl || 'http://192.168.0.116:3001/api/v2'

export class ApiError extends Error {
  status: number
  code?: string
  details?: unknown

  constructor(message: string, status = 0, code?: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Platform': 'mobile',
  },
})

let _cachedToken: string | null = null
let _cachedRefreshToken: string | null = null

export const tokenCache = {
  async get(): Promise<string | null> {
    if (_cachedToken !== null) return _cachedToken
    _cachedToken = await SecureStore.getItemAsync('token')
    if (_cachedToken) await setRealtimeAccessToken(_cachedToken)
    return _cachedToken
  },
  async getRefresh(): Promise<string | null> {
    if (_cachedRefreshToken !== null) return _cachedRefreshToken
    _cachedRefreshToken = await SecureStore.getItemAsync('refresh_token')
    return _cachedRefreshToken
  },
  async set(token: string) {
    _cachedToken = token
    await Promise.all([
      SecureStore.setItemAsync('token', token),
      setRealtimeAccessToken(token),
    ])
  },
  async setSession(token: string, refreshToken: string) {
    _cachedToken = token
    _cachedRefreshToken = refreshToken
    await Promise.all([
      SecureStore.setItemAsync('token', token),
      SecureStore.setItemAsync('refresh_token', refreshToken),
      setRealtimeAccessToken(token),
    ])
  },
  async clear() {
    _cachedToken = null
    _cachedRefreshToken = null
    await Promise.all([
      SecureStore.deleteItemAsync('token'),
      SecureStore.deleteItemAsync('refresh_token'),
      setRealtimeAccessToken(null),
    ])
  },
}

function unwrapGlobalEnvelope<T = any>(value: any): T {
  if (value?.success === true && Object.prototype.hasOwnProperty.call(value, 'data')) {
    return value.data as T
  }
  return value as T
}

function unwrapServiceEnvelope<T = any>(value: any): T {
  const outer = unwrapGlobalEnvelope<any>(value)
  if (outer?.success === true && Object.prototype.hasOwnProperty.call(outer, 'data')) {
    return outer.data as T
  }
  if (
    outer &&
    typeof outer === 'object' &&
    Object.prototype.hasOwnProperty.call(outer, 'data') &&
    Object.keys(outer).every((key) => ['data', 'message', 'success'].includes(key))
  ) {
    return outer.data as T
  }
  return outer as T
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>
    const payload = axiosError.response?.data
    const rawMessage = payload?.message ?? payload?.error ?? axiosError.message
    const message = Array.isArray(rawMessage) ? String(rawMessage[0]) : String(rawMessage || 'Request failed')
    return new ApiError(message, axiosError.response?.status || 0, payload?.code, payload)
  }
  if (error instanceof Error) return new ApiError(error.message)
  return new ApiError('Request failed')
}

api.interceptors.request.use(async (config) => {
  const token = await tokenCache.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (config.method === 'get') config.params = { ...config.params, _t: Date.now() }
  return config
})

api.interceptors.response.use(
  (response) => unwrapGlobalEnvelope(response.data),
  async (error) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined
    const url = originalRequest?.url || ''
    const isAuthRequest = url.includes('/auth/login') || url.includes('/auth/refresh')

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true
      const refreshToken = await tokenCache.getRefresh()

      if (refreshToken) {
        try {
          const refreshResponse = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            { refreshToken },
            {
              timeout: 15000,
              headers: {
                'Content-Type': 'application/json',
                'X-Client-Platform': 'mobile',
              },
            },
          )

          const refreshPayload = unwrapGlobalEnvelope<any>(refreshResponse.data)
          const session = refreshPayload?.session
          if (session?.access_token && session?.refresh_token) {
            await tokenCache.setSession(session.access_token, session.refresh_token)
            originalRequest.headers = originalRequest.headers ?? ({} as any)
            ;(originalRequest.headers as any).Authorization = `Bearer ${session.access_token}`
            return api.request(originalRequest)
          }
        } catch {
          // Clear stale credentials below.
        }
      }

      await tokenCache.clear()
    }

    return Promise.reject(toApiError(error))
  },
)

export default api

// Auth
export const login = (data: { usernameOrEmail: string; password: string }) =>
  api.post<any, any>('/auth/login', data)
export const register = (data: any) => api.post<any, any>('/auth/register', data)
export const verifyOtp = (data: { email: string; token: string }) => api.post<any, any>('/auth/verify', data)
export const getMe = () => api.get<any, User>('/auth/me')
export const logoutSession = () => api.post<any, any>('/auth/logout')
export const changePassword = (data: { currentPassword: string; newPassword: string }) =>
  api.post<any, any>('/auth/change-password', data)
export const deleteAccount = () => api.delete<any, any>('/auth/delete-account')

// Users
export const getUserProfile = () => api.get<any, User>('/users/profile')
export const getUserByUsername = (username: string) => api.get<any, User>(`/users/${encodeURIComponent(username)}`)
export const updateProfile = (data: any) => api.patch<any, User>('/users/profile', data)
export const searchUsers = async (query: string): Promise<User[]> => {
  const result = await api.get<any, any>('/users/search', { params: { q: query } })
  return Array.isArray(result) ? result : unwrapServiceEnvelope<User[]>(result) || []
}
export const getLeaderboard = async (period = 'all', limit = 50): Promise<User[]> => {
  const result = await api.get<any, any>('/users/leaderboard', { params: { period, limit } })
  return Array.isArray(result) ? result : result?.users || []
}
export const getUserPosts = async (username: string): Promise<Post[]> => {
  const result = await api.get<any, any>(`/users/${encodeURIComponent(username)}/posts`)
  return result?.posts || (Array.isArray(result) ? result : [])
}
export const getUserLikedPosts = async (username: string): Promise<Post[]> => {
  const result = await api.get<any, any>(`/users/${encodeURIComponent(username)}/liked-posts`)
  return Array.isArray(result) ? result : []
}
export const getUserCommentedPosts = async (username: string): Promise<Post[]> => {
  const result = await api.get<any, any>(`/users/${encodeURIComponent(username)}/commented-posts`)
  return Array.isArray(result) ? result : []
}
export const getUserActivities = (username: string, page = 1) =>
  api.get<any, any>(`/users/${encodeURIComponent(username)}/activities`, { params: { page, limit: 20 } })
export const getUserStats = (username: string) => api.get<any, any>(`/users/${encodeURIComponent(username)}/stats`)
export const getUserHeatmap = (username: string) => api.get<any, any>(`/users/${encodeURIComponent(username)}/activity-heatmap`)
export const getPinnedPosts = async (username: string): Promise<Post[]> => {
  const result = await api.get<any, any>(`/users/${encodeURIComponent(username)}/pinned-posts`)
  return Array.isArray(result) ? result : []
}

export const getPrivacySettings = async (): Promise<PrivacySettings> => {
  const result = await api.get<any, any>('/users/privacy')
  const value = unwrapServiceEnvelope<any>(result)
  return value?.privacySettings || value
}
export const updatePrivacySettings = async (settings: PrivacySettings): Promise<void> => {
  await api.patch('/users/privacy', { privacySettings: settings })
}
export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  const result = await api.get<any, any>('/users/notification-settings')
  const value = unwrapServiceEnvelope<any>(result)
  return value?.notificationSettings || value
}
export const updateNotificationSettings = async (settings: NotificationSettings): Promise<void> => {
  await api.patch('/users/notification-settings', { notificationSettings: settings })
}
export const getBlockedUsers = async (): Promise<User[]> => {
  const result = await api.get<any, any>('/users/blocked')
  const value = unwrapServiceEnvelope<any>(result)
  return Array.isArray(value) ? value : []
}
export const blockUser = (userId: string) => api.post(`/users/block/${userId}`)
export const unblockUser = (userId: string) => api.delete(`/users/unblock/${userId}`)
export const getSecurityStats = async () => unwrapServiceEnvelope(await api.get('/users/security-stats'))

// Onboarding
export const getOnboardingStatus = async () => unwrapServiceEnvelope(await api.get('/users/onboarding'))
export const updateOnboarding = async (data: any) => unwrapServiceEnvelope(await api.put('/users/onboarding', data))

// Posts
export interface FeedPage {
  posts: Post[]
  total: number
  page: number
  lastPage: number
}
export const getPosts = async (page = 1, limit = 10): Promise<FeedPage> => {
  const result = await api.get<any, any>('/posts', { params: { page, limit } })
  return {
    posts: Array.isArray(result?.posts) ? result.posts : [],
    total: Number(result?.total || 0),
    page: Number(result?.page || page),
    lastPage: Number(result?.lastPage || page),
  }
}
export const searchPosts = async (query: string): Promise<Post[]> => {
  const result = await api.get<any, any>('/posts', { params: { search: query } })
  return Array.isArray(result) ? result : result?.posts || []
}
export const getPost = (id: string) => api.get<any, Post>(`/posts/${id}`)
export const createPost = (data: any) => api.post<any, Post>('/posts', data)
export const deletePost = (id: string) => api.delete(`/posts/${id}`)
export const likePost = (id: string) => api.post<any, any>(`/posts/${id}/like`)
export const getComments = async (postId: string, page = 1): Promise<{ comments: Comment[]; hasMore: boolean; page: number }> => {
  const result = await api.get<any, any>(`/posts/${postId}/comments`, { params: { page, limit: 20 } })
  return {
    comments: result?.comments || [],
    hasMore: Boolean(result?.hasMore),
    page: Number(result?.page || page),
  }
}
export const createComment = (postId: string, data: any) => api.post<any, Comment>(`/posts/${postId}/comments`, data)
export const likeComment = (commentId: string) => api.post(`/posts/comments/${commentId}/like`)
export const deleteComment = (commentId: string) => api.delete(`/posts/comments/${commentId}`)
export const getCommentReplies = async (commentId: string, page = 1) => {
  const result = await api.get<any, any>(`/posts/comments/${commentId}/replies`, { params: { page, limit: 10 } })
  return { replies: result?.replies || [], hasMore: Boolean(result?.hasMore), page: Number(result?.page || page) }
}

// Follow
export const followUser = (userId: string) => api.post(`/follow/${userId}`)
export const unfollowUser = (userId: string) => api.delete(`/follow/${userId}`)
export const isFollowing = async (userId: string): Promise<boolean> => {
  const result = await api.get<any, any>(`/follow/${userId}/is-following`)
  return Boolean(result?.isFollowing)
}
export const getFollowers = async (userId: string, page = 1) => api.get<any, any>(`/follow/${userId}/followers`, { params: { page } })
export const getFollowing = async (userId: string, page = 1) => api.get<any, any>(`/follow/${userId}/following`, { params: { page } })
export const getMutualFollowers = async (userId: string) => api.get<any, User[]>(`/follow/${userId}/mutual-followers`)

// Notifications
export const getNotifications = async (limit = 50): Promise<NotificationPage> => {
  const result = await api.get<any, any>('/notifications', { params: { limit } })
  const value = unwrapServiceEnvelope<any>(result)
  return {
    notifications: value?.notifications || [],
    unreadCount: Number(value?.unreadCount || 0),
  }
}
export const getUnreadNotifications = async (): Promise<number> => {
  const result = await api.get<any, any>('/notifications', { params: { unread: true, limit: 1 } })
  const value = unwrapServiceEnvelope<any>(result)
  return Number(value?.unreadCount || 0)
}
export const markNotificationsRead = (ids?: string[]) => api.put('/notifications/mark-read', ids ? { notificationIds: ids } : {})
export const markNotificationsUnread = (ids: string[]) => api.put('/notifications/mark-unread', { notificationIds: ids })
export const registerMobilePushToken = (token: string) => api.post('/notifications/mobile-push-token', { token })
export const removeMobilePushToken = (token: string) => api.delete('/notifications/mobile-push-token', { data: { token } })

// Messages
export const getConversations = async (): Promise<Conversation[]> => {
  const result = await api.get<any, any>('/messages/conversations')
  return Array.isArray(result) ? result : []
}
export const getMessages = async (conversationId: string, before?: string, limit = 50): Promise<MessagePage> => {
  const result = await api.get<any, any>(`/messages/${conversationId}`, { params: { before, limit } })
  return {
    messages: result?.messages || [],
    nextCursor: result?.nextCursor || null,
  }
}
export const sendMessage = (data: { receiverId: string; content: string }) => api.post<any, Message>('/messages', data)
export const markAsRead = (conversationId: string) => api.patch(`/messages/${conversationId}/read`)
export const getOrCreateConversation = (participantId: string) => api.post<any, { id: string }>('/messages/conversations', { participantId })
export const getUnreadMessageCount = async (): Promise<number> => {
  const result = await api.get<any, any>('/messages/unread-count')
  return typeof result === 'number' ? result : Number(result?.count ?? result ?? 0)
}
export const addMessageReaction = async (conversationId: string, messageId: string, emoji: string) => {
  const result = await api.post<any, any>(`/messages/${conversationId}/${messageId}/reactions`, { emoji })
  return unwrapServiceEnvelope<any>(result)?.reactions || []
}
export const removeMessageReaction = async (conversationId: string, messageId: string, emoji?: string) => {
  const result = await api.delete<any, any>(`/messages/${conversationId}/${messageId}/reactions`, { data: emoji ? { emoji } : {} })
  return unwrapServiceEnvelope<any>(result)?.reactions || []
}

// Trending
export const getTrending = async (period = 'week'): Promise<TrendingData> => {
  const result = await api.get<any, any>('/trending', { params: { period } })
  return {
    trendingPosts: result?.trendingPosts || [],
    trendingTopics: result?.trendingTopics || [],
    risingUsers: result?.risingUsers || [],
    stats: result?.stats || {},
  }
}

// Affiliations
export const getAffiliations = async () => unwrapServiceEnvelope(await api.get('/affiliations'))

// Upload
export const uploadFile = async (uri: string, fileName: string, mimeType: string) => {
  const formData = new FormData()
  formData.append('file', { uri, name: fileName, type: mimeType } as any)
  return api.post<any, { success: boolean; url: string; mimetype: string; size: number }>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
