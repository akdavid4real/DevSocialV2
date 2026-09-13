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

export default function NotificationSettingsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const response = await api.getNotificationSettings()
      return unwrap(response)
    },
  })

  const [notifSettings, setNotifSettings] = useState({
    emailLikes: true,
    emailComments: true,
    emailFollows: true,
    emailMessages: true,
    emailMentions: true,
    pushLikes: true,
    pushComments: true,
    pushFollows: true,
    pushMessages: true,
    pushMentions: true,
    weeklySummary: true,
  })

  useEffect(() => {
    if (settings) setNotifSettings({ ...notifSettings, ...settings })
  }, [settings])

  const updateMutation = useMutation({
    mutationFn: (newSettings: any) => api.updateNotificationSettings(newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] })
      Toast.show({ type: 'success', text1: 'Notification settings updated' })
    },
  })

  const toggleSetting = (key: string) => {
    const newSettings = { ...notifSettings, [key]: !(notifSettings as any)[key] }
    setNotifSettings(newSettings)
    updateMutation.mutate(newSettings)
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#6366f1" />
      </SafeAreaView>
    )
  }

  const pushItems = [
    { key: 'pushLikes', label: 'Likes' },
    { key: 'pushComments', label: 'Comments' },
    { key: 'pushFollows', label: 'New Followers' },
    { key: 'pushMessages', label: 'Messages' },
    { key: 'pushMentions', label: 'Mentions' },
  ]

  const emailItems = [
    { key: 'emailLikes', label: 'Likes' },
    { key: 'emailComments', label: 'Comments' },
    { key: 'emailFollows', label: 'New Followers' },
    { key: 'emailMessages', label: 'Messages' },
    { key: 'emailMentions', label: 'Mentions' },
  ]

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FAFAFA" />
        </Pressable>
        <Text className="text-xl font-bold text-text-primary">Notifications</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 20 }}>
        {/* Push Notifications */}
        <View>
          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">
            Push Notifications
          </Text>
          <Card>
            {pushItems.map((item, i) => (
              <View
                key={item.key}
                className={`flex-row items-center justify-between px-4 py-3.5 ${
                  i < pushItems.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <Text className="text-text-primary font-medium">{item.label}</Text>
                <Switch
                  value={(notifSettings as any)[item.key]}
                  onValueChange={() => toggleSetting(item.key)}
                  trackColor={{ false: '#27272A', true: '#6366f1' }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </Card>
        </View>

        {/* Email Notifications */}
        <View>
          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">
            Email Notifications
          </Text>
          <Card>
            {emailItems.map((item, i) => (
              <View
                key={item.key}
                className={`flex-row items-center justify-between px-4 py-3.5 ${
                  i < emailItems.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <Text className="text-text-primary font-medium">{item.label}</Text>
                <Switch
                  value={(notifSettings as any)[item.key]}
                  onValueChange={() => toggleSetting(item.key)}
                  trackColor={{ false: '#27272A', true: '#6366f1' }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </Card>
        </View>

        {/* Weekly Summary */}
        <View>
          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">
            Digest
          </Text>
          <Card>
            <View className="flex-row items-center justify-between px-4 py-3.5">
              <View>
                <Text className="text-text-primary font-medium">Weekly Summary</Text>
                <Text className="text-text-muted text-xs">Receive a weekly activity summary</Text>
              </View>
              <Switch
                value={notifSettings.weeklySummary}
                onValueChange={() => toggleSetting('weeklySummary')}
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
