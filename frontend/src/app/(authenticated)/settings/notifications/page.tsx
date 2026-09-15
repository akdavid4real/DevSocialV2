'use client'

import { useEffect, useState } from 'react'
import { AtSign, Bell, BellOff, Heart, Loader2, Mail, MessageCircle, MessageSquare, TrendingUp, UserPlus } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import api from '@/lib/api'
import { usePushNotifications } from '@/hooks/use-push-notifications'

type NotificationSettings = {
  emailOnNewFollower: boolean
  emailOnMention: boolean
  emailOnLike: boolean
  emailOnComment: boolean
  emailOnMessage: boolean
  emailDigestFrequency: 'INSTANT' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'NEVER'
  pushOnNewFollower: boolean
  pushOnMention: boolean
  pushOnLike: boolean
  pushOnComment: boolean
  pushOnMessage: boolean
  weeklyDigest: boolean
}

const DEFAULT_SETTINGS: NotificationSettings = {
  emailOnNewFollower: true,
  emailOnMention: true,
  emailOnLike: false,
  emailOnComment: true,
  emailOnMessage: true,
  emailDigestFrequency: 'INSTANT',
  pushOnNewFollower: true,
  pushOnMention: true,
  pushOnLike: true,
  pushOnComment: true,
  pushOnMessage: true,
  weeklyDigest: true,
}

export default function NotificationSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pushSaving, setPushSaving] = useState(false)
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS)
  const pushNotifications = usePushNotifications()

  useEffect(() => {
    void fetchNotificationSettings()
  }, [])

  const fetchNotificationSettings = async () => {
    try {
      const response: any = await api.get('/users/notification-settings')
      const saved = response?.data?.data?.notificationSettings ?? response?.data?.notificationSettings
      if (saved && typeof saved === 'object') {
        setSettings((current) => ({ ...current, ...saved }))
      }
    } catch {
      toast.error('Failed to load notification settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.patch('/users/notification-settings', { notificationSettings: settings })
      toast.success('Notification settings updated')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  const handlePushSubscription = async () => {
    setPushSaving(true)
    try {
      const wasSubscribed = pushNotifications.isSubscribed
      const result = wasSubscribed
        ? await pushNotifications.unsubscribe()
        : await pushNotifications.subscribe()

      if (result.success) {
        toast.success(wasSubscribed ? 'Push notifications disabled' : 'Push notifications enabled')
      } else {
        toast.error(result.error || 'Failed to update push subscription')
      }
    } finally {
      setPushSaving(false)
    }
  }

  const updateSetting = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
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

  const emailItems = [
    ['emailOnNewFollower', UserPlus, 'New Followers', 'When someone follows you'],
    ['emailOnMention', AtSign, 'Mentions', 'When someone mentions you'],
    ['emailOnLike', Heart, 'Likes', 'When someone likes your content'],
    ['emailOnComment', MessageCircle, 'Comments', 'When someone comments or replies'],
    ['emailOnMessage', MessageSquare, 'Direct Messages', 'When someone sends you a message'],
  ] as const

  const pushItems = [
    ['pushOnNewFollower', UserPlus, 'New Followers', 'Push when someone follows you'],
    ['pushOnMention', AtSign, 'Mentions', 'Push when someone mentions you'],
    ['pushOnLike', Heart, 'Likes', 'Push when someone likes your content'],
    ['pushOnComment', MessageCircle, 'Comments', 'Push for comments and replies'],
    ['pushOnMessage', MessageSquare, 'Messages', 'Push for new direct messages'],
  ] as const

  return (
    <div className="divide-y divide-border">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-foreground">Notification Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage delivery preferences. In-app notifications remain available independently.
        </p>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Email Preferences</h3>
          <p className="text-sm text-muted-foreground">
            These preferences are saved now; email delivery requires the deployment email connector to be configured.
          </p>
        </div>

        <div className="space-y-4">
          {emailItems.map(([key, Icon, title, description]) => (
            <div key={key} className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{title}</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                </div>
              </div>
              <Switch checked={settings[key]} onCheckedChange={(checked) => updateSetting(key, checked)} />
            </div>
          ))}
        </div>

        <div className="flex items-start gap-3 pt-4 border-t border-border">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-foreground mb-1">Email Digest Frequency</h4>
            <Select
              value={settings.emailDigestFrequency}
              onValueChange={(value) => updateSetting('emailDigestFrequency', value as NotificationSettings['emailDigestFrequency'])}
            >
              <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="INSTANT">Instant</SelectItem>
                <SelectItem value="HOURLY">Hourly</SelectItem>
                <SelectItem value="DAILY">Daily</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="NEVER">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Browser Push</h3>
          <p className="text-sm text-muted-foreground">Real-time browser notifications using your saved preferences</p>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              {pushNotifications.isSubscribed ? <Bell className="h-5 w-5 text-primary" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
            </div>
            <div>
              <h4 className="font-medium text-foreground">
                {pushNotifications.isSubscribed ? 'Browser Push Enabled' : 'Browser Push Disabled'}
              </h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                {pushNotifications.isSupported ? 'Connect this browser to receive push notifications.' : 'This browser does not support push notifications.'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant={pushNotifications.isSubscribed ? 'outline' : 'default'}
            onClick={handlePushSubscription}
            disabled={!pushNotifications.isSupported || pushNotifications.loading || pushSaving}
          >
            {pushSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : pushNotifications.isSubscribed ? 'Disable Push' : 'Enable Push'}
          </Button>
        </div>

        <div className="space-y-4">
          {pushItems.map(([key, Icon, title, description]) => (
            <div key={key} className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{title}</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                </div>
              </div>
              <Switch checked={settings[key]} onCheckedChange={(checked) => updateSetting(key, checked)} />
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">Weekly Activity Summary</h4>
              <p className="text-sm text-muted-foreground mt-0.5">Include your account in weekly digest generation</p>
            </div>
          </div>
          <Switch checked={settings.weeklyDigest} onCheckedChange={(checked) => updateSetting('weeklyDigest', checked)} />
        </div>
      </div>

      <div className="p-6">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
