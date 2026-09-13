import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.116:3001/api/v2'

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
    return _cachedToken
  },
  async getRefresh(): Promise<string | null> {
    if (_cachedRefreshToken !== null) return _cachedRefreshToken
    _cachedRefreshToken = await SecureStore.getItemAsync('refresh_token')
    return _cachedRefreshToken
  },
  async set(token: string) {
    _cachedToken = token
    await SecureStore.setItemAsync('token', token)
  },
  async setSession(token: string, refreshToken: string) {
    _cachedToken = token
    _cachedRefreshToken = refreshToken
    await Promise.all([
      SecureStore.setItemAsync('token', token),
      SecureStore.setItemAsync('refresh_token', refreshToken),
    ])
  },
  async clear() {
    _cachedToken = null
    _cachedRefreshToken = null
    await Promise.all([
      SecureStore.deleteItemAsync('token'),
      SecureStore.deleteItemAsync('refresh_token'),
    ])
  },
}

api.interceptors.request.use(async (config) => {
  const token = await tokenCache.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.method === 'get') {
    config.params = { ...config.params, _t: Date.now() }
  }
  return config
})

api.interceptors.response.use(
  (response) => response.data ?? response,
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

          const session = refreshResponse.data?.data?.session
          if (session?.access_token && session?.refresh_token) {
            await tokenCache.setSession(session.access_token, session.refresh_token)
            originalRequest.headers = originalRequest.headers ?? ({} as any)
            ;(originalRequest.headers as any).Authorization = `Bearer ${session.access_token}`
            return api.request(originalRequest)
          }
        } catch {
          // Fall through and clear stale credentials.
        }
      }

      await tokenCache.clear()
    }

    return Promise.reject(error.response?.data || error.message)
  },
)

export default api

// Auth
export const login = (data: { usernameOrEmail: string; password: string }) =>
  api.post('/auth/login', data)

export const register = (data: any) => api.post('/auth/register', data)

export const verifyOtp = (data: { email: string; token: string }) =>
  api.post('/auth/verify', data)

export const getMe = () => api.get('/auth/me')
export const logoutSession = () => api.post('/auth/logout')

export const changePassword = (data: { currentPassword: string; newPassword: string }) =>
  api.post('/auth/change-password', data)

export const deleteAccount = () => api.delete('/auth/delete-account')

// Users
export const getUserProfile = () => api.get('/users/profile')

export const getUserByUsername = (username: string) =>
  api.get(`/users/${username}`)

export const updateProfile = (data: any) => api.patch('/users/profile', data)

export const searchUsers = (query: string) =>
  api.get(`/users/search?q=${query}`)

export const getLeaderboard = (period = 'all', limit = 50) =>
  api.get(`/users/leaderboard?period=${period}&limit=${limit}`)

export const getUserPosts = (username: string) =>
  api.get(`/users/${username}/posts`)

export const getUserLikedPosts = (username: string) =>
  api.get(`/users/${username}/liked-posts`)

export const getUserCommentedPosts = (username: string) =>
  api.get(`/users/${username}/commented-posts`)

export const getUserActivities = (username: string, page = 1) =>
  api.get(`/users/${username}/activities?page=${page}&limit=20`)

export const getUserStats = (username: string) =>
  api.get(`/users/${username}/stats`)

export const getUserHeatmap = (username: string) =>
  api.get(`/users/${username}/activity-heatmap`)

export const getPinnedPosts = (username: string) =>
  api.get(`/users/${username}/pinned-posts`)

export const getPrivacySettings = () => api.get('/users/privacy')
export const updatePrivacySettings = (settings: any) =>
  api.patch('/users/privacy', { privacySettings: settings })

export const getNotificationSettings = () => api.get('/users/notification-settings')
export const updateNotificationSettings = (settings: any) =>
  api.patch('/users/notification-settings', { notificationSettings: settings })

export const getBlockedUsers = () => api.get('/users/blocked')
export const unblockUser = (userId: string) => api.delete(`/users/unblock/${userId}`)

export const getSecurityStats = () => api.get('/users/security-stats')

// Onboarding
export const getOnboardingStatus = () => api.get('/users/onboarding')
export const updateOnboarding = (data: any) => api.put('/users/onboarding', data)

// Posts
export const getPosts = (page = 1, limit = 10) =>
  api.get(`/posts?page=${page}&limit=${limit}`)

export const searchPosts = (query: string, page = 1) =>
  api.get(`/posts?search=${query}&page=${page}&limit=10`)

export const getPost = (id: string) => api.get(`/posts/${id}`)

export const createPost = (data: any) => api.post('/posts', data)

export const deletePost = (id: string) => api.delete(`/posts/${id}`)

export const likePost = (id: string) => api.post(`/posts/${id}/like`)

export const getComments = (postId: string, page = 1) =>
  api.get(`/posts/${postId}/comments?page=${page}&limit=20`)

export const createComment = (postId: string, data: any) =>
  api.post(`/posts/${postId}/comments`, data)

export const likeComment = (commentId: string) =>
  api.post(`/posts/comments/${commentId}/like`)

export const deleteComment = (commentId: string) =>
  api.delete(`/posts/comments/${commentId}`)

export const getCommentReplies = (commentId: string, page = 1) =>
  api.get(`/posts/comments/${commentId}/replies?page=${page}&limit=10`)

// Follow
export const followUser = (userId: string) => api.post(`/follow/${userId}`)
export const unfollowUser = (userId: string) => api.delete(`/follow/${userId}`)
export const isFollowing = (userId: string) => api.get(`/follow/${userId}/is-following`)
export const getFollowers = (userId: string, page = 1) =>
  api.get(`/follow/${userId}/followers?page=${page}`)
export const getFollowing = (userId: string, page = 1) =>
  api.get(`/follow/${userId}/following?page=${page}`)
export const getMutualFollowers = (userId: string) =>
  api.get(`/follow/${userId}/mutual-followers`)

// Notifications
export const getNotifications = (limit = 50) =>
  api.get(`/notifications?limit=${limit}`)
export const getUnreadNotifications = () =>
  api.get('/notifications?unread=true&limit=1')
export const markNotificationsRead = (ids?: string[]) =>
  api.put('/notifications/mark-read', ids ? { notificationIds: ids } : {})
export const markNotificationsUnread = (ids: string[]) =>
  api.put('/notifications/mark-unread', { notificationIds: ids })

// Messages
export const getConversations = () => api.get('/messages/conversations')
export const getMessages = (conversationId: string) =>
  api.get(`/messages/${conversationId}`)
export const sendMessage = (data: { receiverId: string; content: string }) =>
  api.post('/messages', data)
export const markAsRead = (conversationId: string) =>
  api.patch(`/messages/${conversationId}/read`)
export const getOrCreateConversation = (participantId: string) =>
  api.post('/messages/conversations', { participantId })
export const getUnreadMessageCount = () => api.get('/messages/unread-count')

// Trending
export const getTrending = (period = 'week') =>
  api.get(`/trending?period=${period}`)

// Affiliations
export const getAffiliations = () => api.get('/affiliations')

// Upload
export const uploadFile = async (uri: string, fileName: string, mimeType: string) => {
  const formData = new FormData()
  formData.append('file', {
    uri,
    name: fileName,
    type: mimeType,
  } as any)

  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
