import { useState } from 'react'
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Settings, MapPin, Calendar, Github, Award } from 'lucide-react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api'
import { timeAgo, formatCount } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { PostCard } from '@/components/home/PostCard'

type ProfileTab = 'posts' | 'liked' | 'commented'

export default function ProfileScreen() {
  const router = useRouter()
  const { user, refreshUser } = useAuth()
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts')
  const queryClient = useQueryClient()

  const postsQuery = useQuery({
    queryKey: ['user-posts', user?.username, activeTab],
    queryFn: async () => {
      if (!user?.username) return []
      if (activeTab === 'posts') return api.getUserPosts(user.username)
      if (activeTab === 'liked') return api.getUserLikedPosts(user.username)
      return api.getUserCommentedPosts(user.username)
    },
    enabled: !!user?.username,
  })

  if (!user) return null

  const onRefresh = async () => {
    await Promise.all([refreshUser(), postsQuery.refetch()])
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlatList
        data={postsQuery.data || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="px-4 py-2">
            <PostCard
              post={item}
              onLike={() => void api.likePost(item.id).then(() => queryClient.invalidateQueries({ queryKey: ['user-posts', user.username] }))}
              onPress={() => router.push(`/(stack)/post/${item.id}`)}
              onAuthorPress={() => {}}
            />
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={postsQuery.isRefetching}
            onRefresh={() => void onRefresh()}
            tintColor="#6366f1"
            colors={['#6366f1']}
          />
        }
        ListHeaderComponent={
          <View>
            {user.bannerUrl ? (
              <Image source={{ uri: user.bannerUrl }} className="w-full h-32" />
            ) : (
              <View className="w-full h-32 bg-primary/20" />
            )}

            <View className="px-4 -mt-10">
              <View className="flex-row items-end justify-between">
                <Avatar uri={user.avatar} name={user.displayName} username={user.username} size="xl" />
                <Pressable
                  onPress={() => router.push('/(stack)/settings')}
                  className="bg-surface-elevated border border-border rounded-xl px-4 py-2 flex-row items-center gap-2"
                >
                  <Settings size={16} color="#A1A1AA" />
                  <Text className="text-text-secondary text-sm font-medium">Settings</Text>
                </Pressable>
              </View>

              <View className="mt-3">
                <View className="flex-row items-center gap-2">
                  <Text className="text-xl font-bold text-text-primary">{user.displayName || user.username}</Text>
                  {user.isVerified && <Badge variant="success">Verified</Badge>}
                </View>
                <Text className="text-text-muted text-sm">@{user.username}</Text>
              </View>

              {user.bio ? <Text className="text-text-secondary mt-2">{user.bio}</Text> : null}

              <View className="flex-row flex-wrap gap-4 mt-3">
                {user.location ? (
                  <View className="flex-row items-center gap-1">
                    <MapPin size={14} color="#71717A" />
                    <Text className="text-text-muted text-sm">{user.location}</Text>
                  </View>
                ) : null}
                {user.createdAt ? (
                  <View className="flex-row items-center gap-1">
                    <Calendar size={14} color="#71717A" />
                    <Text className="text-text-muted text-sm">Joined {timeAgo(user.createdAt)}</Text>
                  </View>
                ) : null}
                {user.githubUsername ? (
                  <View className="flex-row items-center gap-1">
                    <Github size={14} color="#71717A" />
                    <Text className="text-text-muted text-sm">{user.githubUsername}</Text>
                  </View>
                ) : null}
              </View>

              <View className="flex-row gap-5 mt-4">
                <View className="items-center">
                  <Text className="text-text-primary font-bold text-lg">{formatCount(user.followersCount || 0)}</Text>
                  <Text className="text-text-muted text-sm">Followers</Text>
                </View>
                <View className="items-center">
                  <Text className="text-text-primary font-bold text-lg">{formatCount(user.followingCount || 0)}</Text>
                  <Text className="text-text-muted text-sm">Following</Text>
                </View>
                <View className="items-center">
                  <Text className="text-text-primary font-bold text-lg">{formatCount(user.points || 0)}</Text>
                  <Text className="text-text-muted text-sm">Points</Text>
                </View>
                <View className="items-center">
                  <View className="flex-row items-center gap-1">
                    <Award size={14} color="#6366f1" />
                    <Text className="text-text-primary font-bold text-lg">{user.level || 1}</Text>
                  </View>
                  <Text className="text-text-muted text-sm">Level</Text>
                </View>
              </View>

              <View className="flex-row mt-5 border-b border-border">
                {(['posts', 'liked', 'commented'] as const).map((tab) => (
                  <Pressable
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    className={`flex-1 py-3 items-center ${activeTab === tab ? 'border-b-2 border-primary' : ''}`}
                  >
                    <Text className={`font-semibold capitalize ${activeTab === tab ? 'text-primary' : 'text-text-muted'}`}>
                      {tab}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          postsQuery.isLoading ? (
            <View className="py-10 items-center"><ActivityIndicator color="#6366f1" /></View>
          ) : postsQuery.isError ? (
            <View className="items-center justify-center py-20 px-6">
              <Text className="text-text-muted text-center">Could not load {activeTab} posts.</Text>
              <Pressable onPress={() => postsQuery.refetch()} className="mt-4 bg-primary px-4 py-2 rounded-xl">
                <Text className="text-white font-semibold">Retry</Text>
              </Pressable>
            </View>
          ) : (
            <View className="items-center justify-center py-20"><Text className="text-text-muted">No {activeTab} posts</Text></View>
          )
        }
      />
    </SafeAreaView>
  )
}
