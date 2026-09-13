import '../global.css'

// Hermes polyfill for WeakRef if missing
if (typeof WeakRef === 'undefined') {
  // @ts-ignore
  globalThis.WeakRef = class WeakRef<T extends object> {
    private _target: T | undefined
    constructor(target: T) { this._target = target }
    deref(): T | undefined { return this._target }
  }
}

import { useEffect, useState } from 'react'
import { View, ActivityIndicator, Text } from 'react-native'
import { Slot, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
})

function AuthGate() {
  const { user, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (loading || !mounted) return

    const inAuthGroup = segments[0] === '(auth)'
    const inOnboardingGroup = segments[0] === '(onboarding)'

    console.log('[Nav] Segments:', segments.join('/'), '| User:', user?.username || 'none', '| Onboarded:', user?.onboardingCompleted)

    if (!user && !inAuthGroup) {
      console.log('[Nav] → Redirecting to login')
      router.replace('/(auth)/login')
    } else if (user && !user.onboardingCompleted && !inOnboardingGroup) {
      console.log('[Nav] → Redirecting to onboarding')
      router.replace('/(onboarding)')
    } else if (user && user.onboardingCompleted && (inAuthGroup || inOnboardingGroup)) {
      console.log('[Nav] → Redirecting to tabs')
      router.replace('/(tabs)')
    }
  }, [user, loading, segments, mounted])

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0B', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={{ color: '#A1A1AA', marginTop: 16, fontSize: 14 }}>Loading...</Text>
      </View>
    )
  }

  return (
    <>
      <StatusBar style="light" />
      <Slot />
      <Toast position="top" topOffset={60} />
    </>
  )
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AuthGate />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
