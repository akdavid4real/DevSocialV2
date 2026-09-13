'use client'

import { useState, useEffect } from 'react'
import { Monitor, Smartphone, Loader2, LogOut, Shield, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRouter } from '@/lib/navigation'
import { API_BASE_URL } from '@/lib/env'

type Session = {
  id: string
  deviceType: 'desktop' | 'mobile' | 'tablet'
  browser: string
  os: string
  ipAddress: string
  location: string
  lastActive: string
  isCurrent: boolean
}

export default function SecuritySettings() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<Session[]>([])
  const [logoutAllLoading, setLogoutAllLoading] = useState(false)
  const [logoutingSessionId, setLogoutingSessionId] = useState<string | null>(null)

  // Security stats
  const [lastPasswordChange, setLastPasswordChange] = useState<string | null>(null)
  const [accountCreated, setAccountCreated] = useState<string | null>(null)
  const [totalLogins, setTotalLogins] = useState(0)

  useEffect(() => {
    fetchSessions()
    fetchSecurityStats()
  }, [])

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE_URL}/auth/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const { data } = await res.json()
        setSessions(data.sessions || [])
      }
    } catch (error) {
      toast.error('Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  const fetchSecurityStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE_URL}/users/security-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const { data } = await res.json()
        setLastPasswordChange(data.lastPasswordChange)
        setAccountCreated(data.accountCreated)
        setTotalLogins(data.totalLogins || 0)
      }
    } catch (error) {
      // Silent fail
    }
  }

  const handleLogoutSession = async (sessionId: string) => {
    setLogoutingSessionId(sessionId)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE_URL}/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        toast.success('Session logged out')
        setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      } else {
        const error = await res.json()
        toast.error(error.message || 'Failed to logout session')
      }
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setLogoutingSessionId(null)
    }
  }

  const handleLogoutAll = async () => {
    setLogoutAllLoading(true)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE_URL}/auth/logout-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        toast.success('Logged out from all devices')
        localStorage.clear()
        router.push('/login')
      } else {
        const error = await res.json()
        toast.error(error.message || 'Failed to logout')
      }
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setLogoutAllLoading(false)
    }
  }

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />
      case 'tablet':
        return <Smartphone className="h-5 w-5" />
      default:
        return <Monitor className="h-5 w-5" />
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {/* Header */}
      <div className="p-6">
        <h2 className="text-2xl font-bold text-foreground">Security</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your login sessions and security preferences
        </p>
      </div>

      {/* Security Overview */}
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Security Overview</h3>
          <p className="text-sm text-muted-foreground">
            Your account security at a glance
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Account Age</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {accountCreated
                ? Math.floor(
                    (Date.now() - new Date(accountCreated).getTime()) / (1000 * 60 * 60 * 24)
                  )
                : 0}
            </p>
            <p className="text-xs text-muted-foreground">days</p>
          </div>

          <div className="p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Password Changed</span>
            </div>
            <p className="text-sm font-medium text-foreground">
              {lastPasswordChange
                ? new Date(lastPasswordChange).toLocaleDateString()
                : 'Never'}
            </p>
          </div>

          <div className="p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Active Sessions</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{sessions.length}</p>
            <p className="text-xs text-muted-foreground">devices</p>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Active Sessions</h3>
            <p className="text-sm text-muted-foreground">
              Manage devices currently logged into your account
            </p>
          </div>
          {sessions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogoutAll}
              disabled={logoutAllLoading}
            >
              {logoutAllLoading ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Logging out...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-3 w-3" />
                  Logout All
                </>
              )}
            </Button>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-8 border border-border rounded-lg">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No active sessions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border bg-card"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {getDeviceIcon(session.deviceType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-foreground">
                        {session.browser} on {session.os}
                      </h4>
                      {session.isCurrent && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {session.location} • {session.ipAddress}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last active:{' '}
                      {new Date(session.lastActive).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                {!session.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLogoutSession(session.id)}
                    disabled={logoutingSessionId === session.id}
                  >
                    {logoutingSessionId === session.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two-Factor Authentication (Coming Soon) */}
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Two-Factor Authentication
          </h3>
          <p className="text-sm text-muted-foreground">
            Add an extra layer of security to your account
          </p>
        </div>

        <div className="p-4 rounded-lg border-2 border-dashed border-border bg-muted/30">
          <div className="text-center py-4">
            <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground mb-1">
              Two-Factor Authentication
            </p>
            <p className="text-xs text-muted-foreground">
              Coming soon - Protect your account with 2FA
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
