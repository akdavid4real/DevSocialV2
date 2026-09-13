import { useState } from 'react'
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, UserPlus, UserMinus, MessageSquare, MapPin, Award } from 'lucide-react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import * as api from '@/lib/api'
import { unwrap, formatCount, timeAgo } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PostCard } from '@/components/home/PostCard'
import type { Post } from '@/lib/types'

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', username],
    queryFn: async () => {
      const response = await api.getUserByUsername(username!)
      return unwrap(response)
    },
    enabled: !!username,
  })

  const { data: isFollowingData } = useQuery({
    queryKey: ['is-following', profile?.id],
    queryFn: async () => {
      const response = await api.isFollowing(profile.id)
      return unwrap(response)
    },
    enabled: !!profile?.id,
  })

  const { data: posts } = useQuery({
    queryKey: ['user-posts', username],
    queryFn: async () => {
      const response = await api.getUserPosts(username!)
      const data = unwrap(response)
      return (data?.posts || data || []) as Post[]
    },
    enabled: !!username,
  })

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowingData?.isFollowing) {
        return api.unfollowUser(profile.id)
      }
      return api.followUser(profile.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-following', profile?.id] })
      queryClient.invalidateQueries({ queryKey: ['user-profile', username] })
    },
  })

  const handleMessage = async () => {
    try {
      const response = await api.getOrCreateConversation(profile.id)
      const data = unwrap(response)
      router.push(`/(stack)/messages/${data.id}`)
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err.message || 'Failed to start conversation' })
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#6366f1" size="large" />
      </SafeAreaView>
    )
  }

  if (!profile) return null

  const isFollowing = isFollowingData?.isFollowing

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlatList
        data={posts || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="px-4 py-2">
            <PostCard
              post={item}
              onLike={() => api.likePost(item.id).then(() => queryClient.invalidateQueries({ queryKey: ['user-posts'] }))}
              onPress={() => router.push(`/(stack)/post/${item.id}`)}
              onAuthorPress={() => {}}
            />
          </View>
        )}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View className="flex-row items-center gap-3 px-4 py-3">
              <Pressable onPress={() => router.back()}>
                <ArrowLeft size={24} color="#FAFAFA" />
              </Pressable>
              <Text className="text-lg font-bold text-text-primary">@{username}</Text>
            </View>

            {/* Banner */}
            {profile.bannerUrl ? (
              <Image source={{ uri: profile.bannerUrl }} className="w-full h-32" />
            ) : (
              <View className="w-full h-32 bg-primary/20" />
            )}

            {/* Profile Info */}
            <View className="px-4 -mt-10">
              <View className="flex-row items-end justify-between">
                <Avatar uri={profile.avatar} name={profile.displayName} username={profile.username} size="xl" />
                <View className="flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={handleMessage}
                  >
                    <MessageSquare size={16} color="#A1A1AA" />
                  </Button>
                  <Button
                    variant={isFollowing ? 'outline' : 'default'}
                    size="sm"
                    onPress={() => followMutation.mutate()}
                    loading={followMutation.isPending}
                  >
                    <View className="flex-row items-center gap-1">
                      {isFollowing ? (
                        <UserMinus size={16} color="#A1A1AA" />
                      ) : (
                        <UserPlus size={16} color="#fff" />
                      )}
                      <Text className={`text-sm font-semibold ${isFollowing ? 'text-text-secondary' : 'text-white'}`}>
                        {isFollowing ? 'Following' : 'Follow'}
                      </Text>
                    </View>
                  </Button>
                </View>
              </View>

              <View className="mt-3">
                <View className="flex-row items-center gap-2">
                  <Text className="text-xl font-bold text-text-primary">
                    {profile.displayName || profile.username}
                  </Text>
                  {profile.isVerified && <Badge variant="success">Verified</Badge>}
                </View>
                <Text className="text-text-muted text-sm">@{profile.username}</Text>
              </View>

              {profile.bio && (
                <Text className="text-text-secondary mt-2">{profile.bio}</Text>
              )}

              <View className="flex-row flex-wrap gap-4 mt-3">
                {profile.location && (
                  <View className="flex-row items-center gap-1">
                    <MapPin size={14} color="#71717A" />
                    <Text className="text-text-muted text-sm">{profile.location}</Text>
                  </View>
                )}
              </View>

              <View className="flex-row gap-5 mt-4 mb-4">
                <View className="items-center">
                  <Text className="text-text-primary font-bold text-lg">{formatCount(profile.followersCount)}</Text>
                  <Text className="text-text-muted text-sm">Followers</Text>
                </View>
                <View className="items-center">
                  <Text className="text-text-primary font-bold text-lg">{formatCount(profile.followingCount)}</Text>
                  <Text className="text-text-muted text-sm">Following</Text>
                </View>
                <View className="items-center">
                  <View className="flex-row items-center gap-1">
                    <Award size={14} color="#6366f1" />
                    <Text className="text-text-primary font-bold text-lg">{profile.level}</Text>
                  </View>
                  <Text className="text-text-muted text-sm">Level</Text>
                </View>
              </View>
            </View>

            <View className="border-b border-border" />
          </View>
        }
        ListEmptyComponent={
          <View className="items-center py-20">
            <Text className="text-text-muted">No posts yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}
