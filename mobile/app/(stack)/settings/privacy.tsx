import { useState, useEffect } from 'react'
import { View, Text, ScrollView, Pressable, Switch, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft } from 'lucide-react-native'
import Toast from 'react-native-toast-message'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api'
import { unwrap } from '@/lib/utils'
import { Card } from '@/components/ui/Card'

export default function PrivacySettingsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['privacy-settings'],
    queryFn: async () => {
      const response = await api.getPrivacySettings()
      return unwrap(response)
    },
  })

  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public',
    allowMessagesFrom: 'everyone',
    showEmail: false,
    showBirthday: false,
    allowMentions: true,
    showActivityStatus: true,
    allowSearchEngineIndexing: true,
  })

  useEffect(() => {
    if (settings) setPrivacySettings({ ...privacySettings, ...settings })
  }, [settings])

  const updateMutation = useMutation({
    mutationFn: (newSettings: any) => api.updatePrivacySettings(newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privacy-settings'] })
      Toast.show({ type: 'success', text1: 'Privacy settings updated' })
    },
    onError: (err: any) => {
      Toast.show({ type: 'error', text1: err.message || 'Failed to update' })
    },
  })

  const toggleSetting = (key: string) => {
    const newSettings = { ...privacySettings, [key]: !(privacySettings as any)[key] }
    setPrivacySettings(newSettings)
    updateMutation.mutate(newSettings)
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#6366f1" />
      </SafeAreaView>
    )
  }

  const toggleItems = [
    { key: 'showEmail', label: 'Show Email', description: 'Allow others to see your email' },
    { key: 'showBirthday', label: 'Show Birthday', description: 'Display your birthday on profile' },
    { key: 'allowMentions', label: 'Allow Mentions', description: 'Let others mention you in posts' },
    { key: 'showActivityStatus', label: 'Activity Status', description: 'Show when you are online' },
    { key: 'allowSearchEngineIndexing', label: 'Search Indexing', description: 'Allow search engines to index your profile' },
  ]

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FAFAFA" />
        </Pressable>
        <Text className="text-xl font-bold text-text-primary">Privacy</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 20 }}>
        {/* Profile Visibility */}
        <View>
          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">
            Profile Visibility
          </Text>
          <Card>
            <View className="flex-row p-3 gap-2">
              {['public', 'private'].map((v) => (
                <Pressable
                  key={v}
                  onPress={() => {
                    const newSettings = { ...privacySettings, profileVisibility: v }
                    setPrivacySettings(newSettings)
                    updateMutation.mutate(newSettings)
                  }}
                  className={`flex-1 py-3 items-center rounded-xl ${
                    privacySettings.profileVisibility === v
                      ? 'bg-primary/10 border border-primary'
                      : 'bg-surface-elevated border border-border'
                  }`}
                >
                  <Text
                    className={`font-medium capitalize ${
                      privacySettings.profileVisibility === v ? 'text-primary' : 'text-text-muted'
                    }`}
                  >
                    {v}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        </View>

        {/* Messaging */}
        <View>
          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">
            Who Can Message You
          </Text>
          <Card>
            {['everyone', 'followers', 'nobody'].map((v, i) => (
              <Pressable
                key={v}
                onPress={() => {
                  const newSettings = { ...privacySettings, allowMessagesFrom: v }
                  setPrivacySettings(newSettings)
                  updateMutation.mutate(newSettings)
                }}
                className={`flex-row items-center justify-between px-4 py-3 ${
                  i < 2 ? 'border-b border-border' : ''
                }`}
              >
                <Text className="text-text-primary capitalize">{v}</Text>
                {privacySettings.allowMessagesFrom === v && (
                  <View className="w-5 h-5 rounded-full bg-primary items-center justify-center">
                    <Text className="text-white text-xs">✓</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </Card>
        </View>

        {/* Toggle Settings */}
        <View>
          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">
            Privacy Options
          </Text>
          <Card>
            {toggleItems.map((item, i) => (
              <View
                key={item.key}
                className={`flex-row items-center justify-between px-4 py-3.5 ${
                  i < toggleItems.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <View className="flex-1 mr-3">
                  <Text className="text-text-primary font-medium">{item.label}</Text>
                  <Text className="text-text-muted text-xs">{item.description}</Text>
                </View>
                <Switch
                  value={(privacySettings as any)[item.key]}
                  onValueChange={() => toggleSetting(item.key)}
                  trackColor={{ false: '#27272A', true: '#6366f1' }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
