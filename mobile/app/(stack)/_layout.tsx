import { Stack } from 'expo-router'

export default function StackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A0A0B' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="post/[id]" />
      <Stack.Screen name="user/[username]" />
      <Stack.Screen name="messages/index" />
      <Stack.Screen name="messages/[id]" />
      <Stack.Screen name="trending" />
      <Stack.Screen name="leaderboard" />
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="settings/appearance" />
      <Stack.Screen name="settings/profile" />
      <Stack.Screen name="settings/account" />
      <Stack.Screen name="settings/privacy" />
      <Stack.Screen name="settings/notifications" />
      <Stack.Screen name="settings/blocked" />
    </Stack>
  )
}
