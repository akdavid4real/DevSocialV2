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
    try {
      const token = await tokenCache.get()
      if (!token) {
        setUser(null)
        return
      }

      const response = await api.getMe()
      const result = unwrap(response)
      const userData = unwrap(result)
      setUser(userData)
    } catch {
      await tokenCache.clear()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const login = async (credentials: { usernameOrEmail: string; password: string }) => {
    const response = await api.login(credentials)
    const data = unwrap(response)
    const accessToken = data.session?.access_token
    const refreshToken = data.session?.refresh_token

    if (!accessToken || !refreshToken) {
      throw new Error('The server did not return a complete mobile session')
    }

    await tokenCache.setSession(accessToken, refreshToken)
    setUser(data.user)
    Toast.show({ type: 'success', text1: 'Welcome back!' })
  }

  const signup = async (userData: any) => {
    const response = await api.register(userData)
    Toast.show({ type: 'success', text1: 'Registration successful!' })
    return response
  }

  const verifyOtp = async (email: string, token: string) => {
    await api.verifyOtp({ email, token })
    Toast.show({ type: 'success', text1: 'Email verified! Please log in.' })
  }

  const logout = async () => {
    try {
      await api.logoutSession()
    } catch {
      // Local credentials still need to be cleared if the network is unavailable.
    } finally {
      await tokenCache.clear()
      setUser(null)
      Toast.show({ type: 'success', text1: 'Logged out successfully' })
    }
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
