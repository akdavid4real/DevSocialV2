import { useCallback } from 'react'
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Check, UserPlus, X } from 'lucide-react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import api from '@/lib/api'
import { Avatar } from '@/components/ui/Avatar'

type FollowRequest = {
  id: string
  createdAt: string
  user: {
    id: string
    username: string
    displayName?: string | null
    avatar?: string
    level?: number
  }
}

type FollowRequestPage = {
  requests: FollowRequest[]
  total: number
  page: number
  lastPage: number
}

export default function FollowRequestsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['follow-requests', 'incoming'],
    queryFn: () => api.get<any, FollowRequestPage>('/follow/requests/incoming'),
  })

  const respond = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      api.post(`/follow/requests/${id}/${accept ? 'accept' : 'reject'}`),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['follow-requests'] })
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      Toast.show({
        type: 'success',
        text1: variables.accept ? 'Follow request accepted' : 'Follow request declined',
      })
    },
    onError: (error: any) => {
      Toast.show({ type: 'error', text1: error?.message || 'Could not update request' })
    },
  })

  const renderItem = useCallback(({ item }: { item: FollowRequest }) => (
    <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
      <Pressable onPress={() => router.push(`/(stack)/user/${item.user.username}`)}>
        <Avatar
          uri={item.user.avatar}
          name={item.user.displayName || undefined}
          username={item.user.username}
          size="md"
        />
      </Pressable>
      <Pressable
        className="flex-1"
        onPress={() => router.push(`/(stack)/user/${item.user.username}`)}
      >
        <Text className="text-text-primary font-semibold">
          {item.user.displayName || item.user.username}
        </Text>
        <Text className="text-text-muted text-sm">@{item.user.username}</Text>
      </Pressable>
      <Pressable
        className="w-10 h-10 rounded-xl bg-primary items-center justify-center"
        disabled={respond.isPending}
        onPress={() => respond.mutate({ id: item.id, accept: true })}
      >
        <Check size={18} color="#fff" />
      </Pressable>
      <Pressable
        className="w-10 h-10 rounded-xl bg-surface-elevated border border-border items-center justify-center"
        disabled={respond.isPending}
        onPress={() => respond.mutate({ id: item.id, accept: false })}
      >
        <X size={18} color="#A1A1AA" />
      </Pressable>
    </View>
  ), [respond, router])

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FAFAFA" />
        </Pressable>
        <Text className="text-xl font-bold text-text-primary">Follow Requests</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={data?.requests || []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <View className="items-center justify-center py-24 px-8">
              <UserPlus size={48} color="#27272A" />
              <Text className="text-text-primary font-semibold text-lg mt-4">No pending requests</Text>
              <Text className="text-text-muted text-sm text-center mt-1">
                Requests to follow your private profile will appear here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
