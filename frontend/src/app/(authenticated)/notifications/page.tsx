"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CheckCheck, Bell, MoreHorizontal, Heart, MessageCircle, UserPlus, AtSign, AlertCircle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from '@/lib/navigation'
import { useNotifications } from '@/contexts/notification-context'

export default function NotificationsPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const { notifications, loading, fetchNotifications, markAsRead, markAsUnread, markAllAsRead } = useNotifications()
  const [filteredNotifications, setFilteredNotifications] = useState(notifications)

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    if (filter === 'unread') {
      setFilteredNotifications(notifications.filter(n => !n.read))
    } else {
      setFilteredNotifications(notifications)
    }
  }, [notifications, filter])

  const getNotificationIcon = (type: string) => {
    const iconClass = "h-3 w-3"
    switch (type) {
      case 'LIKE': return <Heart className={`${iconClass} text-red-500 fill-red-500`} />
      case 'COMMENT': return <MessageCircle className={`${iconClass} text-blue-500`} />
      case 'FOLLOW': return <UserPlus className={`${iconClass} text-green-500`} />
      case 'MENTION': return <AtSign className={`${iconClass} text-purple-500`} />
      case 'SYSTEM': return <Bell className={`${iconClass} text-gray-500`} />
      default: return <AlertCircle className={`${iconClass} text-gray-500`} />
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/5 rounded w-1/4"></div>
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-white/5 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/5 rounded w-3/4"></div>
                    <div className="h-3 bg-white/5 rounded w-1/2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-4xl">
      <div className="mb-6 md:mb-8">
        <div className="mb-4">
          <h1 className="text-2xl md:text-3xl font-semibold uppercase tracking-tight">Notifications</h1>
          <p className="text-muted-foreground text-sm md:text-base mt-1 md:mt-2 font-medium">Stay synced with your network</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className="uppercase tracking-wider text-xs font-semibold"
            >
              All
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
              className="uppercase tracking-wider text-xs font-semibold"
            >
              Unread
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={markAllAsRead} className="sm:ml-auto uppercase tracking-wider text-xs font-semibold">
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground/60" />
              <h3 className="text-lg font-semibold uppercase tracking-tight mb-2">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </h3>
              <p className="text-muted-foreground text-sm">
                {filter === 'unread' 
                  ? 'All caught up! Check back later for new updates.'
                  : 'When you get notifications, they\'ll show up here.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-colors cursor-pointer border-white/10 ${
                !notification.read 
                  ? 'bg-primary/10 border-primary/30' 
                  : 'bg-white/5 hover:bg-white/10'
              }`}
              onClick={() => {
                if (notification.actionUrl) {
                  if (!notification.read) markAsRead(notification.id)
                  router.push(notification.actionUrl)
                }
              }}
            >
              <CardContent className="p-3 md:p-4">
                <div className="flex gap-3">
                  <div 
                    className="relative flex-shrink-0 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/@${notification.sender.username}`)
                    }}
                  >
                    <Avatar className="h-8 w-8 md:h-10 md:w-10 rounded-lg border border-white/10">
                      <AvatarImage src={notification.sender.avatar} />
                      <AvatarFallback className="text-xs">
                        {(notification.sender.displayName || notification.sender.username)[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border border-white/10">
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm uppercase tracking-tight truncate">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground/70">
                          <span 
                            className="truncate cursor-pointer hover:text-primary transition-colors font-medium"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/@${notification.sender.username}`)
                            }}
                          >
                            From {notification.sender.displayName || notification.sender.username}
                          </span>
                          <Badge variant="outline" className="text-xs uppercase tracking-widest font-semibold flex-shrink-0">
                            L{notification.sender.level}
                          </Badge>
                          <span className="uppercase tracking-widest font-semibold text-xs">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
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
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
