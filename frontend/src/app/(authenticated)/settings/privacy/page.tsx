'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, MessageSquare, Mail, Cake, AtSign, Activity, Search, Loader2 } from 'lucide-react'
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

type PrivacySettings = {
  profileVisibility: 'PUBLIC' | 'PRIVATE'
  whoCanMessage: 'EVERYONE' | 'FOLLOWERS' | 'NOBODY'
  showEmail: boolean
  showBirthday: boolean
  allowMentions: boolean
  showActivityStatus: boolean
  allowSearchEngineIndexing: boolean
}

export default function PrivacySettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<PrivacySettings>({
    profileVisibility: 'PUBLIC',
    whoCanMessage: 'EVERYONE',
    showEmail: false,
    showBirthday: true,
    allowMentions: true,
    showActivityStatus: true,
    allowSearchEngineIndexing: true,
  })

  useEffect(() => {
    fetchPrivacySettings()
  }, [])

  const fetchPrivacySettings = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE_URL}/users/privacy`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const { data } = await res.json()
        if (data.privacySettings) {
          setSettings({ ...settings, ...data.privacySettings })
        }
      }
    } catch (error) {
      toast.error('Failed to load privacy settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE_URL}/users/privacy`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ privacySettings: settings }),
      })

      if (res.ok) {
        toast.success('Privacy settings updated')
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

  const updateSetting = <K extends keyof PrivacySettings>(
    key: K,
    value: PrivacySettings[K]
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
        <h2 className="text-2xl font-bold text-foreground">Privacy Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Control who can see your content and interact with you
        </p>
      </div>

      {/* Profile Visibility */}
      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Profile Visibility</h3>
          <p className="text-sm text-muted-foreground">
            Control who can see your profile and posts
          </p>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              {settings.profileVisibility === 'PUBLIC' ? (
                <Eye className="h-5 w-5 text-primary" />
              ) : (
                <EyeOff className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-foreground mb-1">Profile Type</h4>
              <p className="text-sm text-muted-foreground mb-3">
                {settings.profileVisibility === 'PUBLIC'
                  ? 'Your profile and posts are visible to everyone'
                  : 'Only approved followers can see your profile and posts'}
              </p>
              <Select
                value={settings.profileVisibility}
                onValueChange={(value) =>
                  updateSetting('profileVisibility', value as 'PUBLIC' | 'PRIVATE')
                }
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Messaging */}
      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Messaging</h3>
          <p className="text-sm text-muted-foreground">
            Control who can send you direct messages
          </p>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-foreground mb-1">Who can message you</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Choose who can send you direct messages
              </p>
              <Select
                value={settings.whoCanMessage}
                onValueChange={(value) =>
                  updateSetting('whoCanMessage', value as 'EVERYONE' | 'FOLLOWERS' | 'NOBODY')
                }
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EVERYONE">Everyone</SelectItem>
                  <SelectItem value="FOLLOWERS">People you follow</SelectItem>
                  <SelectItem value="NOBODY">Nobody</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Discoverability */}
      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Discoverability</h3>
          <p className="text-sm text-muted-foreground">
            Manage how others can find and interact with you
          </p>
        </div>

        {/* Show Email */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">Show Email on Profile</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                Display your email address on your public profile
              </p>
            </div>
          </div>
          <Switch
            checked={settings.showEmail}
            onCheckedChange={(checked) => updateSetting('showEmail', checked)}
          />
        </div>

        {/* Show Birthday */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Cake className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">Show Birthday</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                Let others see your birthday on your profile
              </p>
            </div>
          </div>
          <Switch
            checked={settings.showBirthday}
            onCheckedChange={(checked) => updateSetting('showBirthday', checked)}
          />
        </div>

        {/* Allow Mentions */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <AtSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">Allow Mentions</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                Let others mention you in posts and comments
              </p>
            </div>
          </div>
          <Switch
            checked={settings.allowMentions}
            onCheckedChange={(checked) => updateSetting('allowMentions', checked)}
          />
        </div>

        {/* Activity Status */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">Show Activity Status</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                Show when you're active or recently active
              </p>
            </div>
          </div>
          <Switch
            checked={settings.showActivityStatus}
            onCheckedChange={(checked) => updateSetting('showActivityStatus', checked)}
          />
        </div>

        {/* Search Engine Indexing */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Search className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">Search Engine Indexing</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                Allow search engines to index your profile
              </p>
            </div>
          </div>
          <Switch
            checked={settings.allowSearchEngineIndexing}
            onCheckedChange={(checked) => updateSetting('allowSearchEngineIndexing', checked)}
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
