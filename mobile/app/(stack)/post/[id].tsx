import { useCallback, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Send } from 'lucide-react-native'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import * as api from '@/lib/api'
import { timeAgo } from '@/lib/utils'
import { PostCard } from '@/components/home/PostCard'
import { Avatar } from '@/components/ui/Avatar'
import type { Comment } from '@/lib/types'

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [commentText, setCommentText] = useState('')

  const postQuery = useQuery({
    queryKey: ['post', id],
    queryFn: () => api.getPost(id!),
    enabled: !!id,
    retry: (count, error: any) => error?.status >= 500 && count < 2,
  })

  const commentsQuery = useInfiniteQuery({
    queryKey: ['comments', id],
    queryFn: ({ pageParam }) => api.getComments(id!, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: !!id && !!postQuery.data,
  })

  const comments = commentsQuery.data?.pages.flatMap((page) => page.comments) || []

  const commentMutation = useMutation({
    mutationFn: () => api.createComment(id!, { content: commentText.trim() }),
    onSuccess: () => {
      setCommentText('')
      void queryClient.invalidateQueries({ queryKey: ['comments', id] })
      void queryClient.invalidateQueries({ queryKey: ['post', id] })
      void queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
    onError: (err: any) => {
      Toast.show({ type: 'error', text1: err?.message || 'Failed to post comment' })
    },
  })

  const likeMutation = useMutation({
    mutationFn: () => api.likePost(id!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['post', id] })
      void queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
    onError: (err: any) => Toast.show({ type: 'error', text1: err?.message || 'Failed to update like' }),
  })

  const renderComment = useCallback(
    ({ item }: { item: Comment }) => (
      <View className="flex-row gap-3 px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.push(`/(stack)/user/${item.author.username}`)}>
          <Avatar uri={item.author?.avatar} name={item.author?.displayName || undefined} username={item.author?.username} size="sm" />
        </Pressable>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-text-primary font-semibold text-sm">{item.author?.displayName || item.author?.username}</Text>
            <Text className="text-text-muted text-xs">{timeAgo(item.createdAt)}</Text>
          </View>
          <Text className="text-text-secondary mt-1">{item.content}</Text>
        </View>
      </View>
    ),
    [router],
  )

  if (postQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#6366f1" size="large" />
      </SafeAreaView>
    )
  }

  if (postQuery.error || !postQuery.data) {
    const error: any = postQuery.error
    const unavailable = error?.status === 404 || error?.status === 403
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
          <Pressable onPress={() => router.back()}><ArrowLeft size={24} color="#FAFAFA" /></Pressable>
          <Text className="text-lg font-bold text-text-primary">Post</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-text-primary text-lg font-semibold">{unavailable ? 'Post unavailable' : 'Could not load post'}</Text>
          <Text className="text-text-muted text-center mt-2">
            {unavailable ? 'This post may be private, deleted, blocked, or no longer available.' : error?.message || 'Please try again.'}
          </Text>
          {!unavailable && (
            <Pressable onPress={() => postQuery.refetch()} className="mt-4 px-4 py-2 bg-primary rounded-xl"><Text className="text-white font-semibold">Retry</Text></Pressable>
          )}
        </View>
      </SafeAreaView>
    )
  }

  const post = postQuery.data

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
          <Pressable onPress={() => router.back()}><ArrowLeft size={24} color="#FAFAFA" /></Pressable>
          <Text className="text-lg font-bold text-text-primary">Post</Text>
        </View>

        <FlatList
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item) => item.id}
          onEndReached={() => {
            if (commentsQuery.hasNextPage && !commentsQuery.isFetchingNextPage) void commentsQuery.fetchNextPage()
          }}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            <View className="px-4 pt-4">
              <PostCard
                post={post}
                onLike={() => likeMutation.mutate()}
                onPress={() => {}}
                onAuthorPress={() => router.push(`/(stack)/user/${post.author.username}`)}
              />
            </View>
          }
          ListFooterComponent={commentsQuery.isFetchingNextPage ? <View className="py-4"><ActivityIndicator color="#6366f1" /></View> : null}
          ListEmptyComponent={
            commentsQuery.isLoading ? (
              <View className="py-10 items-center"><ActivityIndicator color="#6366f1" /></View>
            ) : commentsQuery.isError ? (
              <View className="items-center py-10 px-6">
                <Text className="text-text-muted text-center">Could not load comments.</Text>
                <Pressable onPress={() => commentsQuery.refetch()} className="mt-3 px-4 py-2 bg-primary rounded-xl"><Text className="text-white">Retry</Text></Pressable>
              </View>
            ) : (
              <View className="items-center py-10"><Text className="text-text-muted">No comments yet</Text></View>
            )
          }
        />

        <View className="flex-row items-center gap-2 px-4 py-3 border-t border-border">
          <TextInput
            placeholder="Write a comment..."
            placeholderTextColor="#71717A"
            value={commentText}
            onChangeText={setCommentText}
            className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-text-primary"
            maxLength={500}
          />
          <Pressable
            onPress={() => commentMutation.mutate()}
            disabled={!commentText.trim() || commentMutation.isPending}
            className={`p-2.5 rounded-xl ${commentText.trim() ? 'bg-primary' : 'bg-surface-elevated'}`}
          >
            <Send size={18} color={commentText.trim() ? '#fff' : '#71717A'} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
