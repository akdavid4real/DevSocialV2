'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, MessageSquare, Mail, Cake, AtSign, Activity, Search, Loader2 } from 'lucide-react'
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

type PrivacySettings = {
  profileVisibility: 'PUBLIC' | 'PRIVATE'
  whoCanMessage: 'EVERYONE' | 'FOLLOWERS' | 'NOBODY'
  showEmail: boolean
  showBirthday: boolean
  allowMentions: boolean
  showActivityStatus: boolean
  allowSearchEngineIndexing: boolean
}

const DEFAULT_SETTINGS: PrivacySettings = {
  profileVisibility: 'PUBLIC',
  whoCanMessage: 'EVERYONE',
  showEmail: false,
  showBirthday: true,
  allowMentions: true,
  showActivityStatus: true,
  allowSearchEngineIndexing: true,
}

export default function PrivacySettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    void fetchPrivacySettings()
  }, [])

  const fetchPrivacySettings = async () => {
    try {
      const response: any = await api.get('/users/privacy')
      const saved = response?.data?.data?.privacySettings ?? response?.data?.privacySettings
      if (saved && typeof saved === 'object') {
        setSettings((current) => ({ ...current, ...saved }))
      }
    } catch {
      toast.error('Failed to load privacy settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      await api.patch('/users/privacy', { privacySettings: settings })
      toast.success('Privacy settings updated')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update settings')
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
      <div className="p-6">
        <h2 className="text-2xl font-bold text-foreground">Privacy Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Control who can see your content and interact with you
        </p>
      </div>

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
                  : 'Your profile is hidden from non-followers. New private follow requests are not available yet.'}
              </p>
              <Select
                value={settings.profileVisibility}
                onValueChange={(value) => updateSetting('profileVisibility', value as 'PUBLIC' | 'PRIVATE')}
              >
                <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Messaging</h3>
          <p className="text-sm text-muted-foreground">Control who can send you direct messages</p>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-foreground mb-1">Who can message you</h4>
              <p className="text-sm text-muted-foreground mb-3">Choose who can send you direct messages</p>
              <Select
                value={settings.whoCanMessage}
                onValueChange={(value) => updateSetting('whoCanMessage', value as 'EVERYONE' | 'FOLLOWERS' | 'NOBODY')}
              >
                <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
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

      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Discoverability</h3>
          <p className="text-sm text-muted-foreground">Manage how others can find and interact with you</p>
        </div>

        {[
          {
            key: 'showEmail' as const,
            icon: Mail,
            title: 'Show Email on Profile',
            description: 'Display your email address on your public profile',
          },
          {
            key: 'showBirthday' as const,
            icon: Cake,
            title: 'Show Birthday',
            description: 'Let others see your birthday on your profile',
          },
          {
            key: 'allowMentions' as const,
            icon: AtSign,
            title: 'Allow Mentions',
            description: 'Let others mention you in posts and comments',
          },
          {
            key: 'showActivityStatus' as const,
            icon: Activity,
            title: 'Show Activity Status',
            description: 'Show your public activity and recent activity views',
          },
          {
            key: 'allowSearchEngineIndexing' as const,
            icon: Search,
            title: 'Search Engine Indexing',
            description: 'Allow search engines to index your profile',
          },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div key={item.key} className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{item.title}</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
                </div>
              </div>
              <Switch
                checked={settings[item.key]}
                onCheckedChange={(checked) => updateSetting(item.key, checked)}
              />
            </div>
          )
        })}
      </div>

      <div className="p-6">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
          ) : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
