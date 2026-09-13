"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import api from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
  actionUrl?: string
  sender: {
    id: string
    username: string
    displayName: string
    avatar?: string
    level: number
  }
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  fetchNotifications: () => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
  markAsUnread: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refreshUnreadCount: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.get('/notifications?limit=50')
      const data = response.data || response
      if (data.success) {
        setNotifications(data.data.notifications)
        setUnreadCount(data.data.unreadCount)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshUnreadCount = useCallback(async () => {
    try {
      const response = await api.get('/notifications?unread=true&limit=1')
      const data = response.data || response
      if (data.success) {
        setUnreadCount(data.data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
      setUnreadCount(0)
    }
  }, [])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await api.put('/notifications/mark-read', {
        notificationIds: [notificationId]
      })
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }, [])

  const markAsUnread = useCallback(async (notificationId: string) => {
    try {
      await api.put('/notifications/mark-unread', {
        notificationIds: [notificationId]
      })
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: false } : n)
      )
      setUnreadCount(prev => prev + 1)
    } catch (error) {
      console.error('Error marking notification as unread:', error)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await api.put('/notifications/mark-read', {})
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }, [])

  // Supabase Realtime subscription for instant notifications
  useEffect(() => {
    if (!user?.id) return

    console.log('🔌 Setting up Supabase Realtime for user:', user.id)

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Notification',
          filter: `recipientId=eq.${user.id}`,
        },
        async (payload) => {
          console.log('📬 New notification received:', payload)
          
          const notificationId = payload.new.id
          
          // Fetch complete notification with sender details
          try {
            const response = await api.get('/notifications?limit=1')
            const data = response.data || response
            
            if (data.success && data.data.notifications.length > 0) {
              const newNotification = data.data.notifications[0]
              
              // Add to notifications list
              setNotifications(prev => [newNotification, ...prev])
              setUnreadCount(prev => prev + 1)
              
              // Show toast notification
              toast.info(newNotification.title, {
                description: newNotification.message,
                duration: 5000,
                action: newNotification.actionUrl ? {
                  label: 'View',
                  onClick: () => window.location.href = newNotification.actionUrl!,
                } : undefined,
              })
            }
          } catch (error) {
            console.error('❌ Error fetching new notification:', error)
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Supabase Realtime status:', status)
      })

    return () => {
      console.log('🔌 Cleaning up Supabase Realtime subscription')
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // Fallback polling (reduced frequency since we have realtime)
  useEffect(() => {
    if (!user) return
    refreshUnreadCount()
    const interval = setInterval(refreshUnreadCount, 300000) // 5 minutes instead of 2
    return () => clearInterval(interval)
  }, [refreshUnreadCount, user])

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      fetchNotifications,
      markAsRead,
      markAsUnread,
      markAllAsRead,
      refreshUnreadCount
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
