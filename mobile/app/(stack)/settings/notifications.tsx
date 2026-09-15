import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, Switch, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft } from 'lucide-react-native'
import Toast from 'react-native-toast-message'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api'
import type { NotificationSettings } from '@/lib/types'
import { Card } from '@/components/ui/Card'

const DEFAULTS: NotificationSettings = {
  emailOnNewFollower: true,
  emailOnMention: true,
  emailOnLike: false,
  emailOnComment: true,
  emailOnMessage: true,
  emailDigestFrequency: 'INSTANT',
  pushOnNewFollower: true,
  pushOnMention: true,
  pushOnLike: true,
  pushOnComment: true,
  pushOnMessage: true,
  weeklyDigest: true,
}

export default function NotificationSettingsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(DEFAULTS)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: api.getNotificationSettings,
  })

  useEffect(() => {
    if (settings) setNotifSettings({ ...DEFAULTS, ...settings })
  }, [settings])

  const updateMutation = useMutation({
    mutationFn: api.updateNotificationSettings,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-settings'] })
      Toast.show({ type: 'success', text1: 'Notification settings updated' })
    },
    onError: (err: any) => {
      Toast.show({ type: 'error', text1: err?.message || 'Failed to update notification settings' })
      if (settings) setNotifSettings({ ...DEFAULTS, ...settings })
    },
  })

  const save = (next: NotificationSettings) => {
    setNotifSettings(next)
    updateMutation.mutate(next)
  }

  const toggle = (key: keyof NotificationSettings) => {
    const current = notifSettings[key]
    if (typeof current !== 'boolean') return
    save({ ...notifSettings, [key]: !current } as NotificationSettings)
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#6366f1" />
      </SafeAreaView>
    )
  }

  const pushItems: Array<{ key: keyof NotificationSettings; label: string }> = [
    { key: 'pushOnLike', label: 'Likes' },
    { key: 'pushOnComment', label: 'Comments' },
    { key: 'pushOnNewFollower', label: 'New Followers' },
    { key: 'pushOnMessage', label: 'Messages' },
    { key: 'pushOnMention', label: 'Mentions' },
  ]
  const emailItems: Array<{ key: keyof NotificationSettings; label: string }> = [
    { key: 'emailOnLike', label: 'Likes' },
    { key: 'emailOnComment', label: 'Comments' },
    { key: 'emailOnNewFollower', label: 'New Followers' },
    { key: 'emailOnMessage', label: 'Messages' },
    { key: 'emailOnMention', label: 'Mentions' },
  ]

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()}><ArrowLeft size={24} color="#FAFAFA" /></Pressable>
        <Text className="text-xl font-bold text-text-primary">Notifications</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 20 }}>
        <View>
          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">Push Notifications</Text>
          <Card>
            {pushItems.map((item, index) => (
              <View key={item.key} className={`flex-row items-center justify-between px-4 py-3.5 ${index < pushItems.length - 1 ? 'border-b border-border' : ''}`}>
                <Text className="text-text-primary font-medium">{item.label}</Text>
                <Switch
                  value={Boolean(notifSettings[item.key])}
                  onValueChange={() => toggle(item.key)}
                  trackColor={{ false: '#27272A', true: '#6366f1' }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </Card>
        </View>

        <View>
          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">Email Notifications</Text>
          <Card>
            {emailItems.map((item, index) => (
              <View key={item.key} className={`flex-row items-center justify-between px-4 py-3.5 ${index < emailItems.length - 1 ? 'border-b border-border' : ''}`}>
                <Text className="text-text-primary font-medium">{item.label}</Text>
                <Switch
                  value={Boolean(notifSettings[item.key])}
                  onValueChange={() => toggle(item.key)}
                  trackColor={{ false: '#27272A', true: '#6366f1' }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </Card>
        </View>

        <View>
          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">Email Frequency</Text>
          <Card>
            {(['INSTANT', 'DAILY', 'WEEKLY', 'NEVER'] as const).map((value, index) => (
              <Pressable
                key={value}
                onPress={() => save({ ...notifSettings, emailDigestFrequency: value })}
                className={`flex-row items-center justify-between px-4 py-3 ${index < 3 ? 'border-b border-border' : ''}`}
              >
                <Text className="text-text-primary">{value.charAt(0) + value.slice(1).toLowerCase()}</Text>
                {notifSettings.emailDigestFrequency === value && <Text className="text-primary font-bold">✓</Text>}
              </Pressable>
            ))}
          </Card>
        </View>

        <View>
          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">Digest</Text>
          <Card>
            <View className="flex-row items-center justify-between px-4 py-3.5">
              <View className="flex-1 mr-3">
                <Text className="text-text-primary font-medium">Weekly Activity Summary</Text>
                <Text className="text-text-muted text-xs">Receive a weekly summary when email delivery is configured</Text>
              </View>
              <Switch
                value={notifSettings.weeklyDigest}
                onValueChange={() => toggle('weeklyDigest')}
                trackColor={{ false: '#27272A', true: '#6366f1' }}
                thumbColor="#fff"
              />
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
