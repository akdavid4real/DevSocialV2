"use client"

import { useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow } from 'date-fns'
import { CheckCheck, Bell, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from '@/components/ui/link'
import { useRouter } from '@/lib/navigation'
import { useNotifications } from '@/contexts/notification-context'

export function NotificationList() {
  const router = useRouter()
  const { notifications, loading, fetchNotifications, markAsRead, markAsUnread, markAllAsRead } = useNotifications()

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'LIKE': return '❤️'
      case 'COMMENT': return '💬'
      case 'FOLLOW': return '👤'
      case 'MENTION': return '📢'
      case 'SYSTEM': return '🔔'
      default: return '📢'
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-2 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-h-96">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm uppercase tracking-wider">Notifications</h3>
        <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
          <CheckCheck className="h-3 w-3 mr-1" />
          Mark all read
        </Button>
      </div>
      
      <ScrollArea className="max-h-80">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No notifications yet</p>
          </div>
        ) : (
          <div className="p-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors ${
                  !notification.read ? 'bg-primary/5' : ''
                }`}
                onClick={() => {
                  if (notification.actionUrl) {
                    if (!notification.read) markAsRead(notification.id)
                    router.push(notification.actionUrl)
                  }
                }}
              >
                <div 
                  className="relative cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/@${notification.sender.username}`)
                  }}
                >
                  <Avatar className="h-8 w-8 rounded-lg border border-white/10">
                    <AvatarImage src={notification.sender.avatar} />
                    <AvatarFallback className="text-xs">
                      {(notification.sender.displayName || notification.sender.username)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 text-xs">
                    {getNotificationIcon(notification.type)}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-semibold uppercase tracking-tight line-clamp-1">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!notification.read && (
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {notification.read ? (
                            <DropdownMenuItem onClick={() => markAsUnread(notification.id)}>
                              Mark as unread
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => markAsRead(notification.id)}>
                              Mark as read
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      
      {notifications.length > 0 && (
        <div className="p-3 border-t">
          <Button variant="ghost" size="sm" className="w-full text-xs uppercase tracking-wider" asChild>
            <Link href="/notifications">
              View all notifications
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
