import { View, Text, FlatList, Pressable, Image, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, UserPlus, UserMinus, MessageSquare, MapPin, Award, Clock3, Lock } from 'lucide-react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import apiClient, * as api from '@/lib/api'
import { formatCount } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PostCard } from '@/components/home/PostCard'

type FollowState = {
  isFollowing: boolean
  requestId: string | null
  requestStatus: string | null
}

type AccessibleProfile = Awaited<ReturnType<typeof api.getUserByUsername>> & {
  isPrivate?: boolean
  canViewContent?: boolean
  requestId?: string | null
  requestStatus?: string | null
}

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const profileQuery = useQuery({
    queryKey: ['user-profile', username],
    queryFn: async (): Promise<AccessibleProfile> => {
      try {
        return await api.getUserByUsername(username!) as AccessibleProfile
      } catch (error: any) {
        if (error?.status !== 404 && error?.status !== 403) throw error
        return apiClient.get<any, AccessibleProfile>(`/profile-access/${encodeURIComponent(username!)}`)
      }
    },
    enabled: !!username,
    retry: (count, error: any) => error?.status >= 500 && count < 2,
  })

  const profile = profileQuery.data

  const followQuery = useQuery({
    queryKey: ['follow-state', profile?.id],
    queryFn: () => apiClient.get<any, FollowState>(`/follow/${profile!.id}/is-following`),
    enabled: !!profile?.id,
    initialData: profile
      ? {
          isFollowing: Boolean((profile as AccessibleProfile).isFollowing),
          requestId: (profile as AccessibleProfile).requestId || null,
          requestStatus: (profile as AccessibleProfile).requestStatus || null,
        }
      : undefined,
  })

  const canViewContent = profile?.canViewContent !== false

  const postsQuery = useQuery({
    queryKey: ['user-posts', username],
    queryFn: () => api.getUserPosts(username!),
    enabled: !!profile?.id && canViewContent,
    retry: false,
  })

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('Profile unavailable')
      const state = followQuery.data
      if (state?.isFollowing) return api.unfollowUser(profile.id)
      if (state?.requestId && state.requestStatus === 'PENDING') {
        return apiClient.delete(`/follow/requests/${state.requestId}`)
      }
      return api.followUser(profile.id)
    },
    onSuccess: (response: any) => {
      void queryClient.invalidateQueries({ queryKey: ['follow-state', profile?.id] })
      void queryClient.invalidateQueries({ queryKey: ['user-profile', username] })
      void queryClient.invalidateQueries({ queryKey: ['follow-requests'] })
      const data = response?.data || response
      if (data?.requested) {
        Toast.show({ type: 'success', text1: 'Follow request sent' })
      } else if (followQuery.data?.requestStatus === 'PENDING') {
        Toast.show({ type: 'success', text1: 'Follow request cancelled' })
      }
    },
    onError: (error: any) => {
      Toast.show({ type: 'error', text1: error?.message || 'Unable to update follow state' })
    },
  })

  const handleMessage = async () => {
    if (!profile) return
    try {
      const conversation = await api.getOrCreateConversation(profile.id)
      await queryClient.invalidateQueries({ queryKey: ['conversations'] })
      router.push(`/(stack)/messages/${conversation.id}`)
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error?.message || 'You cannot message this user' })
    }
  }

  if (profileQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#6366f1" size="large" />
      </SafeAreaView>
    )
  }

  if (profileQuery.error || !profile) {
    const error: any = profileQuery.error
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
          <Pressable onPress={() => router.back()}><ArrowLeft size={24} color="#FAFAFA" /></Pressable>
          <Text className="text-lg font-bold text-text-primary">Profile</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-text-primary text-lg font-semibold">Profile unavailable</Text>
          <Text className="text-text-muted text-center mt-2">{error?.message || 'This account may be blocked or no longer available.'}</Text>
        </View>
      </SafeAreaView>
    )
  }

  const posts = postsQuery.data || []
  const followState = followQuery.data
  const isFollowing = Boolean(followState?.isFollowing)
  const isRequested = followState?.requestStatus === 'PENDING' && Boolean(followState.requestId)

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="px-4 py-2">
            <PostCard
              post={item}
              onLike={() => void api.likePost(item.id).then(() => queryClient.invalidateQueries({ queryKey: ['user-posts', username] }))}
              onPress={() => router.push(`/(stack)/post/${item.id}`)}
              onAuthorPress={() => {}}
            />
          </View>
        )}
        ListHeaderComponent={
          <View>
            <View className="flex-row items-center gap-3 px-4 py-3">
              <Pressable onPress={() => router.back()}><ArrowLeft size={24} color="#FAFAFA" /></Pressable>
              <Text className="text-lg font-bold text-text-primary">@{username}</Text>
            </View>

            {profile.bannerUrl ? <Image source={{ uri: profile.bannerUrl }} className="w-full h-32" /> : <View className="w-full h-32 bg-primary/20" />}

            <View className="px-4 -mt-10">
              <View className="flex-row items-end justify-between">
                <Avatar uri={profile.avatar} name={profile.displayName || undefined} username={profile.username} size="xl" />
                <View className="flex-row gap-2">
                  <Button variant="outline" size="sm" onPress={handleMessage}><MessageSquare size={16} color="#A1A1AA" /></Button>
                  <Button
                    variant={isFollowing || isRequested ? 'outline' : 'default'}
                    size="sm"
                    onPress={() => followMutation.mutate()}
                    loading={followMutation.isPending || followQuery.isLoading}
                  >
                    <View className="flex-row items-center gap-1">
                      {isFollowing ? <UserMinus size={16} color="#A1A1AA" /> : isRequested ? <Clock3 size={16} color="#A1A1AA" /> : <UserPlus size={16} color="#fff" />}
                      <Text className={`text-sm font-semibold ${isFollowing || isRequested ? 'text-text-secondary' : 'text-white'}`}>
                        {isFollowing ? 'Following' : isRequested ? 'Requested' : 'Follow'}
                      </Text>
                    </View>
                  </Button>
                </View>
              </View>

              <View className="mt-3">
                <View className="flex-row items-center gap-2">
                  <Text className="text-xl font-bold text-text-primary">{profile.displayName || profile.username}</Text>
                  {profile.isVerified && <Badge variant="success">Verified</Badge>}
                  {profile.isPrivate && <Lock size={14} color="#A1A1AA" />}
                </View>
                <Text className="text-text-muted text-sm">@{profile.username}</Text>
              </View>

              {canViewContent && profile.bio && <Text className="text-text-secondary mt-2">{profile.bio}</Text>}
              {canViewContent && profile.location && (
                <View className="flex-row items-center gap-1 mt-3"><MapPin size={14} color="#71717A" /><Text className="text-text-muted text-sm">{profile.location}</Text></View>
              )}

              <View className="flex-row gap-5 mt-4 mb-4">
                <View className="items-center"><Text className="text-text-primary font-bold text-lg">{formatCount(profile.followersCount || 0)}</Text><Text className="text-text-muted text-sm">Followers</Text></View>
                <View className="items-center"><Text className="text-text-primary font-bold text-lg">{formatCount(profile.followingCount || 0)}</Text><Text className="text-text-muted text-sm">Following</Text></View>
                <View className="items-center"><View className="flex-row items-center gap-1"><Award size={14} color="#6366f1" /><Text className="text-text-primary font-bold text-lg">{profile.level || 1}</Text></View><Text className="text-text-muted text-sm">Level</Text></View>
              </View>
            </View>
            <View className="border-b border-border" />
          </View>
        }
        ListEmptyComponent={
          !canViewContent
            ? <View className="items-center py-20 px-6"><Lock size={40} color="#27272A" /><Text className="text-text-primary font-semibold mt-4">This profile is private</Text><Text className="text-text-muted text-center mt-1">Send a follow request to see this user's posts and activity.</Text></View>
            : postsQuery.isError
              ? <View className="items-center py-20 px-6"><Text className="text-text-muted text-center">Posts are not available for this profile.</Text></View>
              : <View className="items-center py-20"><Text className="text-text-muted">No posts yet</Text></View>
        }
      />
    </SafeAreaView>
  )
}
