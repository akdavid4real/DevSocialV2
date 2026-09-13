import { View, Text, ScrollView, Pressable, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  ArrowLeft,
  User,
  Shield,
  Bell,
  Palette,
  Lock,
  UserX,
  LogOut,
  ChevronRight,
} from 'lucide-react-native'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/Card'

const SETTINGS_SECTIONS = [
  {
    title: 'Preferences',
    items: [
      { icon: Palette, label: 'Appearance', description: 'Theme and display settings', route: '/(stack)/settings/appearance' },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: User, label: 'Profile', description: 'Edit your profile information', route: '/(stack)/settings/profile' },
      { icon: Shield, label: 'Account', description: 'Password, email, delete account', route: '/(stack)/settings/account' },
      { icon: Lock, label: 'Privacy', description: 'Profile visibility and data', route: '/(stack)/settings/privacy' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { icon: Bell, label: 'Notifications', description: 'Notification preferences', route: '/(stack)/settings/notifications' },
      { icon: UserX, label: 'Blocked Users', description: 'Manage blocked users', route: '/(stack)/settings/blocked' },
    ],
  },
]

export default function SettingsScreen() {
  const router = useRouter()
  const { logout } = useAuth()

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout()
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FAFAFA" />
        </Pressable>
        <Text className="text-xl font-bold text-text-primary">Settings</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 20 }}>
        {SETTINGS_SECTIONS.map((section) => (
          <View key={section.title}>
            <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">
              {section.title}
            </Text>
            <Card>
              {section.items.map((item, index) => {
                const Icon = item.icon
                return (
                  <Pressable
                    key={item.label}
                    onPress={() => router.push(item.route as any)}
                    className={`flex-row items-center gap-3 px-4 py-3.5 ${
                      index < section.items.length - 1 ? 'border-b border-border' : ''
                    }`}
                  >
                    <View className="w-9 h-9 rounded-xl bg-surface-elevated items-center justify-center">
                      <Icon size={18} color="#A1A1AA" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-text-primary font-medium">{item.label}</Text>
                      <Text className="text-text-muted text-xs">{item.description}</Text>
                    </View>
                    <ChevronRight size={18} color="#71717A" />
                  </Pressable>
                )
              })}
            </Card>
          </View>
        ))}

        {/* Logout */}
        <Pressable
          onPress={handleLogout}
          className="flex-row items-center gap-3 bg-destructive/10 rounded-2xl px-4 py-3.5"
        >
          <LogOut size={20} color="#ef4444" />
          <Text className="text-destructive font-semibold">Logout</Text>
        </Pressable>

        <Text className="text-text-muted text-xs text-center mt-4">
          DevSocial v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
