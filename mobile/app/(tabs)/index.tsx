import { useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MessageSquare } from 'lucide-react-native'
import * as api from '@/lib/api'
import { PostCard } from '@/components/home/PostCard'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Post } from '@/lib/types'

export default function HomeScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: ({ pageParam }) => api.getPosts(pageParam, 10),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.lastPage ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
  })

  const posts = data?.pages.flatMap((page) => page.posts) || []

  const likeMutation = useMutation({
    mutationFn: (postId: string) => api.likePost(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] })
      queryClient.setQueryData(['posts'], (old: any) => {
        if (!old?.pages) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: (page.posts || []).map((post: Post) =>
              post.id === postId
                ? {
                    ...post,
                    isLiked: !post.isLiked,
                    likesCount: Math.max(0, post.likesCount + (post.isLiked ? -1 : 1)),
                  }
                : post,
            ),
          })),
        }
      })
    },
    onError: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  })

  const renderPost = useCallback(
    ({ item }: { item: Post }) => (
      <PostCard
        post={item}
        onLike={() => likeMutation.mutate(item.id)}
        onPress={() => router.push(`/(stack)/post/${item.id}`)}
        onAuthorPress={() => router.push(`/(stack)/user/${item.author.username}`)}
      />
    ),
    [likeMutation, router],
  )

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="px-4 pt-4 gap-4">
          {[1, 2, 3].map((i) => (
            <View key={i} className="bg-surface border border-border rounded-2xl p-4 gap-3">
              <View className="flex-row items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <View className="gap-1">
                  <Skeleton className="w-24 h-4" />
                  <Skeleton className="w-16 h-3" />
                </View>
              </View>
              <Skeleton className="w-full h-16" />
            </View>
          ))}
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <Text className="text-2xl font-bold text-text-primary">DevSocial</Text>
        <Pressable onPress={() => router.push('/(stack)/messages')}>
          <MessageSquare size={24} color="#A1A1AA" />
        </Pressable>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage()
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-4"><ActivityIndicator color="#6366f1" /></View>
          ) : null
        }
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
            <Text className="text-text-secondary text-lg">No posts yet</Text>
            <Text className="text-text-muted text-sm mt-1">Follow people to see their posts here</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}
