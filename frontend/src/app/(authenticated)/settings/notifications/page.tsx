'use client'

import { useState, useEffect } from 'react'
import { Mail, Bell, BellOff, MessageSquare, Heart, MessageCircle, UserPlus, AtSign, TrendingUp, Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
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
import { API_BASE_URL } from '@/lib/env'
import { usePushNotifications } from '@/hooks/use-push-notifications'

type NotificationSettings = {
  // Email notifications
  emailOnNewFollower: boolean
  emailOnMention: boolean
  emailOnLike: boolean
  emailOnComment: boolean
  emailOnMessage: boolean
  emailDigestFrequency: 'INSTANT' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'NEVER'

  // Push notifications
  pushOnNewFollower: boolean
  pushOnMention: boolean
  pushOnLike: boolean
  pushOnComment: boolean
  pushOnMessage: boolean

  // Other
  weeklyDigest: boolean
}

export default function NotificationSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pushSaving, setPushSaving] = useState(false)
  const pushNotifications = usePushNotifications()
  const [settings, setSettings] = useState<NotificationSettings>({
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
  })

  useEffect(() => {
    fetchNotificationSettings()
  }, [])

  const fetchNotificationSettings = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE_URL}/users/notification-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const { data } = await res.json()
        if (data.notificationSettings) {
          setSettings({ ...settings, ...data.notificationSettings })
        }
      }
    } catch (error) {
      toast.error('Failed to load notification settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE_URL}/users/notification-settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notificationSettings: settings }),
      })

      if (res.ok) {
        toast.success('Notification settings updated')
      } else {
        const error = await res.json()
        toast.error(error.message || 'Failed to update settings')
      }
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handlePushSubscription = async () => {
    setPushSaving(true)

    try {
      const result = pushNotifications.isSubscribed
        ? await pushNotifications.unsubscribe()
        : await pushNotifications.subscribe()

      if (result.success) {
        toast.success(pushNotifications.isSubscribed ? 'Push notifications disabled' : 'Push notifications enabled')
      } else {
        toast.error(result.error || 'Failed to update push subscription')
      }
    } finally {
      setPushSaving(false)
    }
  }

  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
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

  return (
    <div className="divide-y divide-border">
      {/* Header */}
      <div className="p-6">
        <h2 className="text-2xl font-bold text-foreground">Notification Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your email and push notification preferences
        </p>
      </div>

      {/* Email Notifications */}
      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Email Notifications</h3>
          <p className="text-sm text-muted-foreground">
            Choose what you want to be notified about via email
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">New Followers</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  When someone follows you
                </p>
              </div>
            </div>
            <Switch
              checked={settings.emailOnNewFollower}
              onCheckedChange={(checked) => updateSetting('emailOnNewFollower', checked)}
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <AtSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Mentions</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  When someone mentions you in a post or comment
                </p>
              </div>
            </div>
            <Switch
              checked={settings.emailOnMention}
              onCheckedChange={(checked) => updateSetting('emailOnMention', checked)}
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Likes</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  When someone likes your post
                </p>
              </div>
            </div>
            <Switch
              checked={settings.emailOnLike}
              onCheckedChange={(checked) => updateSetting('emailOnLike', checked)}
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Comments</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  When someone comments on your post
                </p>
              </div>
            </div>
            <Switch
              checked={settings.emailOnComment}
              onCheckedChange={(checked) => updateSetting('emailOnComment', checked)}
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Direct Messages</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  When you receive a new direct message
                </p>
              </div>
            </div>
            <Switch
              checked={settings.emailOnMessage}
              onCheckedChange={(checked) => updateSetting('emailOnMessage', checked)}
            />
          </div>
        </div>

        {/* Email Frequency */}
        <div className="flex items-start justify-between gap-4 pt-4 border-t border-border">
          <div className="flex items-start gap-3 flex-1">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-foreground mb-1">Email Digest Frequency</h4>
              <p className="text-sm text-muted-foreground mb-3">
                How often you want to receive email notifications
              </p>
              <Select
                value={settings.emailDigestFrequency}
                onValueChange={(value) =>
                  updateSetting('emailDigestFrequency', value as any)
                }
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INSTANT">Instant (as they happen)</SelectItem>
                  <SelectItem value="HOURLY">Hourly Digest</SelectItem>
                  <SelectItem value="DAILY">Daily Digest</SelectItem>
                  <SelectItem value="WEEKLY">Weekly Digest</SelectItem>
                  <SelectItem value="NEVER">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Push Notifications */}
      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Push Notifications</h3>
          <p className="text-sm text-muted-foreground">
            Real-time browser notifications for important updates
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              {pushNotifications.isSubscribed ? (
                <Bell className="h-5 w-5 text-primary" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <h4 className="font-medium text-foreground">
                {pushNotifications.isSubscribed ? 'Browser Push Enabled' : 'Browser Push Disabled'}
              </h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                {pushNotifications.isSupported
                  ? 'Connect this browser to receive push notifications.'
                  : 'This browser does not support push notifications.'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant={pushNotifications.isSubscribed ? 'outline' : 'default'}
            onClick={handlePushSubscription}
            disabled={!pushNotifications.isSupported || pushNotifications.loading || pushSaving}
            className="sm:w-auto"
          >
            {pushSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : pushNotifications.isSubscribed ? (
              'Disable Push'
            ) : (
              'Enable Push'
            )}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">New Followers</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Get notified when someone follows you
                </p>
              </div>
            </div>
            <Switch
              checked={settings.pushOnNewFollower}
              onCheckedChange={(checked) => updateSetting('pushOnNewFollower', checked)}
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <AtSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Mentions</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  When someone mentions you
                </p>
              </div>
            </div>
            <Switch
              checked={settings.pushOnMention}
              onCheckedChange={(checked) => updateSetting('pushOnMention', checked)}
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Likes</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  When someone likes your content
                </p>
              </div>
            </div>
            <Switch
              checked={settings.pushOnLike}
              onCheckedChange={(checked) => updateSetting('pushOnLike', checked)}
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Comments</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  When someone comments on your post
                </p>
              </div>
            </div>
            <Switch
              checked={settings.pushOnComment}
              onCheckedChange={(checked) => updateSetting('pushOnComment', checked)}
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Messages</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  When you get a new message
                </p>
              </div>
            </div>
            <Switch
              checked={settings.pushOnMessage}
              onCheckedChange={(checked) => updateSetting('pushOnMessage', checked)}
            />
          </div>
        </div>
      </div>

      {/* Other */}
      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Digest & Summary</h3>
          <p className="text-sm text-muted-foreground">
            Periodic summaries of your activity
          </p>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">Weekly Activity Summary</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                Get a weekly email with your activity highlights and stats
              </p>
            </div>
          </div>
          <Switch
            checked={settings.weeklyDigest}
            onCheckedChange={(checked) => updateSetting('weeklyDigest', checked)}
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="p-6">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  )
}
