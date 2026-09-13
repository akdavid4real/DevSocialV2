import { useState } from 'react'
import { View, Text, ScrollView, Pressable, Switch } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Sun, Moon, Monitor } from 'lucide-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Card } from '@/components/ui/Card'

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export default function AppearanceSettingsScreen() {
  const router = useRouter()
  const [theme, setTheme] = useState('dark')
  const [compactMode, setCompactMode] = useState(false)
  const [reduceAnimations, setReduceAnimations] = useState(false)

  const handleThemeChange = async (value: string) => {
    setTheme(value)
    await AsyncStorage.setItem('theme', value)
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
        {/* Theme Selection */}
        <View>
          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">
            Theme
          </Text>
          <Card>
            <View className="flex-row p-3 gap-3">
              {THEMES.map((t) => {
                const Icon = t.icon
                return (
                  <Pressable
                    key={t.value}
                    onPress={() => handleThemeChange(t.value)}
                    className={`flex-1 items-center py-4 rounded-xl border ${
                      theme === t.value
                        ? 'bg-primary/10 border-primary'
                        : 'bg-surface-elevated border-border'
                    }`}
                  >
                    <Icon
                      size={24}
                      color={theme === t.value ? '#6366f1' : '#71717A'}
                    />
                    <Text
                      className={`text-sm mt-2 font-medium ${
                        theme === t.value ? 'text-primary' : 'text-text-muted'
                      }`}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </Card>
        </View>

        {/* Display Settings */}
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
                value={compactMode}
                onValueChange={setCompactMode}
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
                value={reduceAnimations}
                onValueChange={setReduceAnimations}
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
