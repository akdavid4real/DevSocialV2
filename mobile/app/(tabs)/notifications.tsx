import { useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CheckCheck } from 'lucide-react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api'
import { unwrap } from '@/lib/utils'
import { timeAgo } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import type { Notification } from '@/lib/types'

export default function NotificationsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: notifications, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.getNotifications()
      return unwrap(response) as Notification[]
    },
  })

  const markReadMutation = useMutation({
    mutationFn: () => api.markNotificationsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const handlePress = (notification: Notification) => {
    if (!notification.read) {
      api.markNotificationsRead([notification.id])
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }

    if (notification.relatedType === 'post' && notification.relatedId) {
      router.push(`/(stack)/post/${notification.relatedId}`)
    } else if (notification.relatedType === 'user' && notification.sender?.username) {
      router.push(`/(stack)/user/${notification.sender.username}`)
    }
  }

  const renderNotification = useCallback(
    ({ item }: { item: Notification }) => (
      <Pressable
        onPress={() => handlePress(item)}
        className={`flex-row gap-3 px-4 py-3 border-b border-border ${
          !item.read ? 'bg-primary/5' : ''
        }`}
      >
        <Avatar
          uri={item.sender?.avatar}
          name={item.sender?.displayName}
          username={item.sender?.username}
          size="md"
        />
        <View className="flex-1">
          <Text className="text-text-primary text-sm">
            <Text className="font-semibold">{item.sender?.displayName || item.sender?.username}</Text>
            {' '}{item.message}
          </Text>
          <Text className="text-text-muted text-xs mt-1">{timeAgo(item.createdAt)}</Text>
        </View>
        {!item.read && <View className="w-2 h-2 rounded-full bg-primary mt-2" />}
      </Pressable>
    ),
    []
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <Text className="text-2xl font-bold text-text-primary">Notifications</Text>
        <Pressable
          onPress={() => markReadMutation.mutate()}
          className="flex-row items-center gap-1"
        >
          <CheckCheck size={18} color="#6366f1" />
          <Text className="text-primary text-sm font-medium">Read all</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6366f1" size="large" />
        </View>
      ) : (
        <FlatList
          data={notifications || []}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#6366f1"
              colors={['#6366f1']}
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Text className="text-text-muted text-lg">No notifications yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
