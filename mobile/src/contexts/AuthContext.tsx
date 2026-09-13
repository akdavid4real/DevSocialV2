import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import Toast from 'react-native-toast-message'
import * as api from '@/lib/api'
import { tokenCache } from '@/lib/api'
import { unwrap } from '@/lib/utils'
import type { User } from '@/lib/types'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  login: (credentials: { usernameOrEmail: string; password: string }) => Promise<void>
  signup: (userData: any) => Promise<any>
  verifyOtp: (email: string, token: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  login: async () => {},
  signup: async () => {},
  verifyOtp: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    console.log('[Auth] Loading user...')
    try {
      const token = await tokenCache.get()
      if (!token) {
        console.log('[Auth] No token found, user is guest')
        setUser(null)
        setLoading(false)
        return
      }

      console.log('[Auth] Token found, fetching user...')
      const response = await api.getMe()
      const result = unwrap(response)
      // getMe returns { data: user } wrapped by TransformInterceptor, so unwrap twice
      const userData = unwrap(result)
      console.log('[Auth] User loaded:', userData?.username)
      setUser(userData)
    } catch (error) {
      console.log('[Auth] Load failed, clearing token:', error)
      await tokenCache.clear()
      setUser(null)
    } finally {
      console.log('[Auth] Loading complete')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const login = async (credentials: { usernameOrEmail: string; password: string }) => {
    console.log('[Auth] Logging in:', credentials.usernameOrEmail)
    const response = await api.login(credentials)
    const data = unwrap(response)

    await tokenCache.set(data.session.access_token)
    console.log('[Auth] Login success, user:', data.user?.username)
    setUser(data.user)

    Toast.show({ type: 'success', text1: 'Welcome back!' })
  }

  const signup = async (userData: any) => {
    console.log('[Auth] Signing up:', userData.username)
    const response = await api.register(userData)
    console.log('[Auth] Signup success')
    Toast.show({ type: 'success', text1: 'Registration successful!' })
    return response
  }

  const verifyOtp = async (email: string, token: string) => {
    const response = await api.verifyOtp({ email, token })
    const data = unwrap(response)

    if (data.session?.access_token) {
      await tokenCache.set(data.session.access_token)
    }

    await loadUser()
    Toast.show({ type: 'success', text1: 'Email verified!' })
  }

  const logout = async () => {
    console.log('[Auth] Logging out')
    await tokenCache.clear()
    setUser(null)
    Toast.show({ type: 'success', text1: 'Logged out successfully' })
  }

  const refreshUser = async () => {
    await loadUser()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        signup,
        verifyOtp,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
