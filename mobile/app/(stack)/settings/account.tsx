import { useState } from 'react'
import { View, Text, ScrollView, Pressable, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Mail, Key, Trash2 } from 'lucide-react-native'
import Toast from 'react-native-toast-message'
import { useMutation } from '@tanstack/react-query'
import * as api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function AccountSettingsScreen() {
  const router = useRouter()
  const { user, logout } = useAuth()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const changePasswordMutation = useMutation({
    mutationFn: () => api.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Password changed successfully' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (err: any) => {
      Toast.show({ type: 'error', text1: err.message || 'Failed to change password' })
    },
  })

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Passwords do not match' })
      return
    }
    if (newPassword.length < 8) {
      Toast.show({ type: 'error', text1: 'Password must be at least 8 characters' })
      return
    }
    changePasswordMutation.mutate()
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              `Type your username "${user?.username}" to confirm deletion.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Forever',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await api.deleteAccount()
                      await logout()
                      Toast.show({ type: 'success', text1: 'Account deleted' })
                    } catch (err: any) {
                      Toast.show({ type: 'error', text1: err.message || 'Failed to delete account' })
                    }
                  },
                },
              ]
            )
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FAFAFA" />
        </Pressable>
        <Text className="text-xl font-bold text-text-primary">Account</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 20 }}>
        {/* Email */}
        <View>
          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">
            Email
          </Text>
          <Card>
            <View className="flex-row items-center gap-3 px-4 py-3.5">
              <Mail size={18} color="#A1A1AA" />
              <Text className="text-text-primary">{user?.email}</Text>
            </View>
          </Card>
        </View>

        {/* Change Password */}
        <View>
          <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">
            Change Password
          </Text>
          <Card className="p-4 gap-3">
            <Input
              label="Current Password"
              placeholder="Enter current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <Input
              label="New Password"
              placeholder="Enter new password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <Input
              label="Confirm New Password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <Button
              onPress={handleChangePassword}
              loading={changePasswordMutation.isPending}
              disabled={!currentPassword || !newPassword || !confirmPassword}
            >
              <View className="flex-row items-center gap-2">
                <Key size={16} color="#fff" />
                <Text className="text-white font-semibold">Change Password</Text>
              </View>
            </Button>
          </Card>
        </View>

        {/* Danger Zone */}
        <View>
          <Text className="text-destructive text-xs font-semibold uppercase tracking-wider mb-2 px-1">
            Danger Zone
          </Text>
          <Pressable
            onPress={handleDeleteAccount}
            className="flex-row items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-2xl px-4 py-3.5"
          >
            <Trash2 size={20} color="#ef4444" />
            <View className="flex-1">
              <Text className="text-destructive font-semibold">Delete Account</Text>
              <Text className="text-destructive/70 text-xs">Permanently delete your account and all data</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
