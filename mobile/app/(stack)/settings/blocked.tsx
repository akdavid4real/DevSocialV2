import { useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, UserX } from 'lucide-react-native'
import Toast from 'react-native-toast-message'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api'
import { unwrap } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'

export default function BlockedUsersScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: blockedUsers, isLoading } = useQuery({
    queryKey: ['blocked-users'],
    queryFn: async () => {
      const response = await api.getBlockedUsers()
      return unwrap(response) as any[]
    },
  })

  const unblockMutation = useMutation({
    mutationFn: (userId: string) => api.unblockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] })
      Toast.show({ type: 'success', text1: 'User unblocked' })
    },
  })

  const handleUnblock = (user: any) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${user.displayName || user.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: () => unblockMutation.mutate(user.id),
        },
      ]
    )
  }

  const renderUser = useCallback(
    ({ item }: { item: any }) => (
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
        <Avatar uri={item.avatar} name={item.displayName} username={item.username} size="md" />
        <View className="flex-1">
          <Text className="text-text-primary font-semibold">
            {item.displayName || item.username}
          </Text>
          <Text className="text-text-muted text-sm">@{item.username}</Text>
        </View>
        <Button
          variant="outline"
          size="sm"
          onPress={() => handleUnblock(item)}
        >
          Unblock
        </Button>
      </View>
    ),
    []
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FAFAFA" />
        </Pressable>
        <Text className="text-xl font-bold text-text-primary">Blocked Users</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={blockedUsers || []}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View className="items-center justify-center py-20 px-6">
              <UserX size={48} color="#27272A" />
              <Text className="text-text-muted text-lg mt-4">No blocked users</Text>
              <Text className="text-text-muted text-sm text-center mt-1">
                Users you block won't be able to see your profile or contact you
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
