import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, Switch, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft } from 'lucide-react-native'
import Toast from 'react-native-toast-message'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api'
import type { PrivacySettings } from '@/lib/types'
import { Card } from '@/components/ui/Card'

const DEFAULTS: PrivacySettings = {
  profileVisibility: 'PUBLIC',
  whoCanMessage: 'EVERYONE',
  showEmail: false,
  showBirthday: false,
  allowMentions: true,
  showActivityStatus: true,
  allowSearchEngineIndexing: true,
}

export default function PrivacySettingsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(DEFAULTS)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['privacy-settings'],
    queryFn: api.getPrivacySettings,
  })

  useEffect(() => {
    if (settings) setPrivacySettings({ ...DEFAULTS, ...settings })
  }, [settings])

  const updateMutation = useMutation({
    mutationFn: api.updatePrivacySettings,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['privacy-settings'] })
      Toast.show({ type: 'success', text1: 'Privacy settings updated' })
    },
    onError: (err: any) => {
      Toast.show({ type: 'error', text1: err?.message || 'Failed to update privacy settings' })
      if (settings) setPrivacySettings({ ...DEFAULTS, ...settings })
    },
  })

  const save = (next: PrivacySettings) => {
    setPrivacySettings(next)
    updateMutation.mutate(next)
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#6366f1" />
      </SafeAreaView>
    )
  }

  const toggleItems: Array<{ key: keyof PrivacySettings; label: string; description: string }> = [
    { key: 'showEmail', label: 'Show Email', description: 'Allow others to see your email' },
    { key: 'showBirthday', label: 'Show Birthday', description: 'Display your birthday on profile' },
    { key: 'allowMentions', label: 'Allow Mentions', description: 'Let others mention you in posts and comments' },
    { key: 'showActivityStatus', label: 'Activity Status', description: 'Show when you are active' },
    { key: 'allowSearchEngineIndexing', label: 'Search Indexing', description: 'Allow search engines to index your profile' },
  ]

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()}><ArrowLeft size={24} color="#FAFAFA" /></Pressable>
        <Text className="text-xl font-bold text-text-primary">Privacy</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 20 }}>
        <View>
          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">Profile Visibility</Text>
          <Card>
            <View className="flex-row p-3 gap-2">
              {(['PUBLIC', 'PRIVATE'] as const).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => save({ ...privacySettings, profileVisibility: value })}
                  className={`flex-1 py-3 items-center rounded-xl ${privacySettings.profileVisibility === value ? 'bg-primary/10 border border-primary' : 'bg-surface-elevated border border-border'}`}
                >
                  <Text className={privacySettings.profileVisibility === value ? 'text-primary font-medium' : 'text-text-muted font-medium'}>
                    {value === 'PUBLIC' ? 'Public' : 'Private'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        </View>

        <View>
          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">Who Can Message You</Text>
          <Card>
            {(['EVERYONE', 'FOLLOWERS', 'NOBODY'] as const).map((value, index) => (
              <Pressable
                key={value}
                onPress={() => save({ ...privacySettings, whoCanMessage: value })}
                className={`flex-row items-center justify-between px-4 py-3 ${index < 2 ? 'border-b border-border' : ''}`}
              >
                <Text className="text-text-primary">
                  {value === 'EVERYONE' ? 'Everyone' : value === 'FOLLOWERS' ? 'People you follow' : 'Nobody'}
                </Text>
                {privacySettings.whoCanMessage === value && (
                  <View className="w-5 h-5 rounded-full bg-primary items-center justify-center"><Text className="text-white text-xs">✓</Text></View>
                )}
              </Pressable>
            ))}
          </Card>
        </View>

        <View>
          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">Privacy Options</Text>
          <Card>
            {toggleItems.map((item, index) => (
              <View key={item.key} className={`flex-row items-center justify-between px-4 py-3.5 ${index < toggleItems.length - 1 ? 'border-b border-border' : ''}`}>
                <View className="flex-1 mr-3">
                  <Text className="text-text-primary font-medium">{item.label}</Text>
                  <Text className="text-text-muted text-xs">{item.description}</Text>
                </View>
                <Switch
                  value={Boolean(privacySettings[item.key])}
                  onValueChange={(checked) => save({ ...privacySettings, [item.key]: checked } as PrivacySettings)}
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
