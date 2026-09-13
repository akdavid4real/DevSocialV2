import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ImagePlus, X, Send } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import Toast from 'react-native-toast-message'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api'
import { unwrap } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'

export default function CreatePostScreen() {
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [isAnonymous, setIsAnonymous] = useState(false)
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: async () => {
      let imageUrls: string[] = []

      // Upload images first
      for (const uri of images) {
        const fileName = uri.split('/').pop() || 'image.jpg'
        const response = await api.uploadFile(uri, fileName, 'image/jpeg')
        const data = unwrap(response)
        if (data?.url) imageUrls.push(data.url)
      }

      return api.createPost({
        content,
        imageUrls,
        isAnonymous,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      Toast.show({ type: 'success', text1: 'Post created!' })
      setContent('')
      setImages([])
      router.back()
    },
    onError: (err: any) => {
      Toast.show({ type: 'error', text1: err.message || 'Failed to create post' })
    },
  })

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 4 - images.length,
    })

    if (!result.canceled) {
      const newImages = result.assets.map((a) => a.uri)
      setImages((prev) => [...prev, ...newImages].slice(0, 4))
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
          <Pressable onPress={() => router.back()}>
            <Text className="text-text-secondary text-base">Cancel</Text>
          </Pressable>
          <Text className="text-text-primary font-bold text-lg">New Post</Text>
          <Button
            size="sm"
            onPress={() => createMutation.mutate()}
            disabled={!content.trim()}
            loading={createMutation.isPending}
          >
            <View className="flex-row items-center gap-1">
              <Send size={16} color="#fff" />
              <Text className="text-white font-semibold">Post</Text>
            </View>
          </Button>
        </View>

        <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
          {/* Author info */}
          <View className="flex-row items-center gap-3 py-4">
            <Avatar uri={user?.avatar} name={user?.displayName} username={user?.username} />
            <View>
              <Text className="text-text-primary font-semibold">
                {isAnonymous ? 'Anonymous' : user?.displayName || user?.username}
              </Text>
              {!isAnonymous && (
                <Text className="text-text-muted text-sm">@{user?.username}</Text>
              )}
            </View>
          </View>

          {/* Content Input */}
          <TextInput
            placeholder="What's on your mind?"
            placeholderTextColor="#71717A"
            value={content}
            onChangeText={setContent}
            multiline
            className="text-text-primary text-base min-h-[120px]"
            textAlignVertical="top"
          />

          {/* Image Previews */}
          {images.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mt-4">
              {images.map((uri, index) => (
                <View key={index} className="relative">
                  <Image
                    source={{ uri }}
                    className="w-24 h-24 rounded-xl"
                  />
                  <Pressable
                    onPress={() => removeImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full items-center justify-center"
                  >
                    <X size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Bottom Toolbar */}
        <View className="flex-row items-center justify-between px-4 py-3 border-t border-border">
          <View className="flex-row gap-4">
            <Pressable onPress={pickImage} disabled={images.length >= 4}>
              <ImagePlus size={24} color={images.length >= 4 ? '#27272A' : '#6366f1'} />
            </Pressable>
          </View>

          <Pressable
            onPress={() => setIsAnonymous(!isAnonymous)}
            className={`px-3 py-1.5 rounded-full ${isAnonymous ? 'bg-primary/20' : 'bg-surface-elevated'}`}
          >
            <Text className={`text-sm font-medium ${isAnonymous ? 'text-primary' : 'text-text-muted'}`}>
              {isAnonymous ? 'Anonymous' : 'Public'}
            </Text>
          </Pressable>

          <Text className="text-text-muted text-sm">
            {content.length}/2000
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
