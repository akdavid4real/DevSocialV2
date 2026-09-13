'use client'

import { useEffect, useState } from 'react'
import { Loader2, LogOut, Shield, AlertCircle, CheckCircle2, Clock, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRouter } from '@/lib/navigation'
import api from '@/lib/api'
import { setAccessToken } from '@/lib/auth-token'

type Session = {
  id: string
  lastActive: string
  expiresAt?: string | null
  isCurrent: boolean
}

export default function SecuritySettings() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<Session[]>([])
  const [logoutAllLoading, setLogoutAllLoading] = useState(false)
  const [logoutCurrentLoading, setLogoutCurrentLoading] = useState(false)
  const [lastPasswordChange, setLastPasswordChange] = useState<string | null>(null)
  const [accountCreated, setAccountCreated] = useState<string | null>(null)
  const [totalLogins, setTotalLogins] = useState(0)

  useEffect(() => {
    fetchSessions()
    fetchSecurityStats()
  }, [])

  const fetchSessions = async () => {
    try {
      const response: any = await api.get('/auth/sessions')
      setSessions(response?.data?.sessions || [])
    } catch {
      toast.error('Failed to load session information')
    } finally {
      setLoading(false)
    }
  }

  const fetchSecurityStats = async () => {
    try {
      const response: any = await api.get('/users/security-stats')
      const data = response?.data
      if (data) {
        setLastPasswordChange(data.lastPasswordChange)
        setAccountCreated(data.accountCreated)
        setTotalLogins(data.totalLogins || 0)
      }
    } catch {
      // Optional overview data; session revocation remains available.
    }
  }

  const clearClientSession = () => {
    setAccessToken(null)
    router.push('/auth/login')
  }

  const handleLogoutCurrent = async () => {
    const current = sessions.find((session) => session.isCurrent)
    if (!current) return

    setLogoutCurrentLoading(true)
    try {
      await api.delete(`/auth/sessions/${current.id}`)
      toast.success('Current session revoked')
      clearClientSession()
    } catch (error: any) {
      toast.error(error?.message || 'Failed to revoke current session')
    } finally {
      setLogoutCurrentLoading(false)
    }
  }

  const handleLogoutAll = async () => {
    setLogoutAllLoading(true)
    try {
      await api.post('/auth/logout-all', {})
      toast.success('All sessions have been revoked')
      clearClientSession()
    } catch (error: any) {
      toast.error(error?.message || 'Failed to logout all sessions')
    } finally {
      setLogoutAllLoading(false)
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

  const currentSession = sessions.find((session) => session.isCurrent)

  return (
    <div className="divide-y divide-border">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-foreground">Security</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review your current login session and revoke access when needed.
        </p>
      </div>

      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Security Overview</h3>
          <p className="text-sm text-muted-foreground">Your account security at a glance</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Account Age</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {accountCreated
                ? Math.max(0, Math.floor((Date.now() - new Date(accountCreated).getTime()) / 86400000))
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
              {lastPasswordChange ? new Date(lastPasswordChange).toLocaleDateString() : 'Not available'}
            </p>
          </div>

          <div className="p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Recorded Logins</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalLogins}</p>
            <p className="text-xs text-muted-foreground">logins</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Current Session</h3>
            <p className="text-sm text-muted-foreground">
              DevSocial verifies this browser session against Supabase. Use “All devices” to revoke every active login for your account.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleLogoutCurrent} disabled={!currentSession || logoutCurrentLoading}>
              {logoutCurrentLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <LogOut className="mr-2 h-3 w-3" />}
              This session
            </Button>
            <Button variant="destructive" size="sm" onClick={handleLogoutAll} disabled={logoutAllLoading}>
              {logoutAllLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <LogOut className="mr-2 h-3 w-3" />}
              All devices
            </Button>
          </div>
        </div>

        {!currentSession ? (
          <div className="text-center py-8 border border-border rounded-lg">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No active session could be verified.</p>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-foreground">Current browser session</h4>
                <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded">Current</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Verified: {new Date(currentSession.lastActive).toLocaleString()}
              </p>
              {currentSession.expiresAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Access token expires: {new Date(currentSession.expiresAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Two-Factor Authentication</h3>
          <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
        </div>
        <div className="p-4 rounded-lg border-2 border-dashed border-border bg-muted/30 text-center py-8">
          <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground mb-1">Two-Factor Authentication</p>
          <p className="text-xs text-muted-foreground">Coming soon</p>
        </div>
      </div>
    </div>
  )
}
