import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Camera } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import Toast from 'react-native-toast-message'
import { useMutation } from '@tanstack/react-query'
import * as api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'

type PickedAvatar = {
  uri: string
  fileName: string
  mimeType: string
}

export default function ProfileSettingsScreen() {
  const router = useRouter()
  const { user, refreshUser } = useAuth()

  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [location, setLocation] = useState(user?.location || '')
  const [website, setWebsite] = useState(user?.website || '')
  const [githubUsername, setGithubUsername] = useState(user?.githubUsername || '')
  const [linkedinUrl, setLinkedinUrl] = useState(user?.linkedinUrl || '')
  const [portfolioUrl, setPortfolioUrl] = useState(user?.portfolioUrl || '')
  const [avatar, setAvatar] = useState<PickedAvatar | null>(null)

  const updateMutation = useMutation({
    mutationFn: async () => {
      let avatarUrl: string | undefined
      if (avatar) {
        const uploaded = await api.uploadFile(avatar.uri, avatar.fileName, avatar.mimeType)
        avatarUrl = uploaded?.url
      }

      return api.updateProfile({
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
        website: website.trim() || undefined,
        githubUsername: githubUsername.trim() || undefined,
        linkedinUrl: linkedinUrl.trim() || undefined,
        portfolioUrl: portfolioUrl.trim() || undefined,
        avatar: avatarUrl || undefined,
      })
    },
    onSuccess: async () => {
      await refreshUser()
      Toast.show({ type: 'success', text1: 'Profile updated!' })
    },
    onError: (err: any) => {
      Toast.show({ type: 'error', text1: err?.message || 'Failed to update profile' })
    },
  })

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (!result.canceled) {
      const asset = result.assets[0]
      const mimeType = asset.mimeType || inferMimeType(asset.fileName || asset.uri)
      setAvatar({
        uri: asset.uri,
        mimeType,
        fileName: asset.fileName || `avatar.${extensionForMime(mimeType)}`,
      })
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()}>
            <ArrowLeft size={24} color="#FAFAFA" />
          </Pressable>
          <Text className="text-xl font-bold text-text-primary">Edit Profile</Text>
        </View>
        <Button size="sm" onPress={() => updateMutation.mutate()} loading={updateMutation.isPending}>
          Save
        </Button>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
          <View className="items-center">
            <Pressable onPress={pickAvatar} className="relative">
              {avatar ? (
                <Image source={{ uri: avatar.uri }} className="w-24 h-24 rounded-full" />
              ) : (
                <Avatar uri={user?.avatar} name={user?.displayName} username={user?.username} size="xl" />
              )}
              <View className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full items-center justify-center">
                <Camera size={16} color="#fff" />
              </View>
            </Pressable>
          </View>

          <Input label="Display Name" placeholder="Your display name" value={displayName} onChangeText={setDisplayName} />
          <Input label="Bio" placeholder="Tell us about yourself..." value={bio} onChangeText={setBio} multiline numberOfLines={3} className="min-h-[80px]" />
          <Input label="Location" placeholder="City, Country" value={location} onChangeText={setLocation} />
          <Input label="Website" placeholder="https://your-website.com" value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" />
          <Input label="GitHub Username" placeholder="your-github-username" value={githubUsername} onChangeText={setGithubUsername} autoCapitalize="none" />
          <Input label="LinkedIn URL" placeholder="https://linkedin.com/in/..." value={linkedinUrl} onChangeText={setLinkedinUrl} autoCapitalize="none" keyboardType="url" />
          <Input label="Portfolio URL" placeholder="https://your-portfolio.com" value={portfolioUrl} onChangeText={setPortfolioUrl} autoCapitalize="none" keyboardType="url" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function inferMimeType(value: string) {
  const lower = value.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  return 'image/jpeg'
}

function extensionForMime(mime: string) {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  return 'jpg'
}
