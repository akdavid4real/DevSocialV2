import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import * as SecureStore from 'expo-secure-store'
import * as api from './api'

const MOBILE_PUSH_TOKEN_KEY = 'devsocial_mobile_push_token'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export async function registerForMobilePush(): Promise<string | null> {
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID

  if (!projectId) return null

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    })
  }

  const existing = await Notifications.getPermissionsAsync()
  let status = existing.status
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync()
    status = requested.status
  }
  if (status !== 'granted') return null

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data
  if (!token) return null

  await api.registerMobilePushToken(token)
  await SecureStore.setItemAsync(MOBILE_PUSH_TOKEN_KEY, token)
  return token
}

export async function unregisterStoredMobilePush() {
  const token = await SecureStore.getItemAsync(MOBILE_PUSH_TOKEN_KEY)
  if (!token) return

  try {
    await api.removeMobilePushToken(token)
  } finally {
    await SecureStore.deleteItemAsync(MOBILE_PUSH_TOKEN_KEY)
  }
}

export function notificationUrl(response: Notifications.NotificationResponse): string | null {
  const data = response.notification.request.content.data || {}
  const url = typeof data.url === 'string' ? data.url : null
  if (!url) return null

  if (url.startsWith('/posts/')) {
    const id = url.split('/').filter(Boolean).pop()
    return id ? `/(stack)/post/${id}` : null
  }
  if (url.startsWith('/@')) {
    const username = url.slice(2)
    return username ? `/(stack)/user/${username}` : null
  }
  if (url === '/messages' || url.startsWith('/messages/')) return '/(stack)/messages'
  if (url === '/notifications') return '/(tabs)/notifications'
  return null
}
