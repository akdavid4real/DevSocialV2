import { View, Text, ScrollView, Pressable, Switch, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Sun, Moon, Monitor } from 'lucide-react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import { Card } from '@/components/ui/Card'
import {
  DEFAULT_APPEARANCE_SETTINGS,
  getAppearanceSettings,
  updateAppearanceSettings,
  type AppearanceSettings,
} from '@/lib/appearance-api'

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const

export default function AppearanceSettingsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: settings = DEFAULT_APPEARANCE_SETTINGS, isLoading } = useQuery({
    queryKey: ['appearance-settings'],
    queryFn: getAppearanceSettings,
  })

  const mutation = useMutation({
    mutationFn: updateAppearanceSettings,
    onSuccess: (next) => {
      queryClient.setQueryData(['appearance-settings'], next)
      Toast.show({ type: 'success', text1: 'Appearance updated' })
    },
    onError: (error: any) => {
      Toast.show({ type: 'error', text1: error?.message || 'Failed to update appearance' })
    },
  })

  const save = (patch: Partial<AppearanceSettings>) => {
    mutation.mutate({ ...settings, ...patch })
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#6366f1" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FAFAFA" />
        </Pressable>
        <Text className="text-xl font-bold text-text-primary">Appearance</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 20 }}>
        <View>
          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">
            Theme
          </Text>
          <Card>
            <View className="flex-row p-3 gap-3">
              {THEMES.map((item) => {
                const Icon = item.icon
                const selected = settings.theme === item.value
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => save({ theme: item.value })}
                    className={`flex-1 items-center py-4 rounded-xl border ${
                      selected ? 'bg-primary/10 border-primary' : 'bg-surface-elevated border-border'
                    }`}
                  >
                    <Icon size={24} color={selected ? '#6366f1' : '#71717A'} />
                    <Text className={`text-sm mt-2 font-medium ${selected ? 'text-primary' : 'text-text-muted'}`}>
                      {item.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </Card>
        </View>

        <View>
          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">
            Display
          </Text>
          <Card>
            <View className="flex-row items-center justify-between px-4 py-3.5 border-b border-border">
              <View>
                <Text className="text-text-primary font-medium">Compact Mode</Text>
                <Text className="text-text-muted text-xs">Show more content on screen</Text>
              </View>
              <Switch
                value={settings.compactMode}
                onValueChange={(value) => save({ compactMode: value })}
                trackColor={{ false: '#27272A', true: '#6366f1' }}
                thumbColor="#fff"
              />
            </View>
            <View className="flex-row items-center justify-between px-4 py-3.5">
              <View>
                <Text className="text-text-primary font-medium">Reduce Animations</Text>
                <Text className="text-text-muted text-xs">Minimize motion effects</Text>
              </View>
              <Switch
                value={settings.reducedMotion}
                onValueChange={(value) => save({ reducedMotion: value })}
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
