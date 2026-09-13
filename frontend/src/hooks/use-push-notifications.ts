import { useCallback, useEffect, useState } from 'react'
import { API_BASE_URL, VAPID_PUBLIC_KEY } from '@/lib/env'

type PushResult = {
  success: boolean
  error?: string
}

type PushSubscriptionResponse = {
  data?: {
    subscribed?: boolean
  }
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)

  const getToken = () => localStorage.getItem('token')

  const checkSubscription = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setIsSupported(false)
      setIsSubscribed(false)
      setLoading(false)
      return
    }

    setIsSupported(true)

    try {
      const token = getToken()
      const registration = await navigator.serviceWorker.getRegistration()
      const browserSubscription = registration
        ? await registration.pushManager.getSubscription()
        : null

      const res = await fetch(`${API_BASE_URL}/notifications/push-subscription`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (res.ok) {
        const data = (await res.json()) as PushSubscriptionResponse
        setIsSubscribed(!!browserSubscription && !!data.data?.subscribed)
      } else {
        setIsSubscribed(!!browserSubscription)
      }
    } catch (error) {
      setIsSubscribed(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void checkSubscription()
  }, [checkSubscription])

  const subscribe = async (): Promise<PushResult> => {
    if (!isSupported) {
      return { success: false, error: 'Push notifications are not supported in this browser' }
    }

    if (!VAPID_PUBLIC_KEY) {
      return { success: false, error: 'Push notifications are not configured for this deployment' }
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission was not granted' }
    }

    try {
      let registration = await navigator.serviceWorker.getRegistration()
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      }

      const existingSubscription = await registration.pushManager.getSubscription()
      if (existingSubscription) {
        await existingSubscription.unsubscribe()
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const token = getToken()
      const res = await fetch(`${API_BASE_URL}/notifications/push-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(subscription.toJSON()),
      })

      if (!res.ok) {
        await subscription.unsubscribe()
        return { success: false, error: 'Failed to save push subscription' }
      }

      setIsSubscribed(true)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enable push notifications',
      }
    }
  }

  const unsubscribe = async (): Promise<PushResult> => {
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      const subscription = registration ? await registration.pushManager.getSubscription() : null
      if (subscription) {
        await subscription.unsubscribe()
      }

      const token = getToken()
      const res = await fetch(`${API_BASE_URL}/notifications/push-subscription`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (!res.ok) {
        return { success: false, error: 'Failed to clear push subscription' }
      }

      setIsSubscribed(false)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disable push notifications',
      }
    }
  }

  return {
    isSupported,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
    refresh: checkSubscription,
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index)
  }

  return outputArray
}
