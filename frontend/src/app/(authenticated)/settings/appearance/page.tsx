'use client'

import { useEffect, useState } from 'react'
import { useTheme } from '@/providers/theme-provider'
import { useAppearance } from '@/contexts/appearance-context'
import {
  LayoutList,
  Maximize2,
  Moon,
  Minimize2,
  Palette,
  Zap,
  Monitor,
  Eye,
  EyeOff,
  Sun,
  Loader2,
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark' | 'system'
type FontSize = 'small' | 'medium' | 'large'
type ColorTheme = 'vibrant' | 'classic'

type AppearanceSettings = {
  theme: Theme
  fontSize: FontSize
  compactMode: boolean
  highContrast: boolean
  reducedMotion: boolean
  colorTheme: ColorTheme
  sidebarCollapsed: boolean
  showAvatars: boolean
}

const fontSizes = [
  { value: 'small', label: 'Small', className: 'text-sm' },
  { value: 'medium', label: 'Medium', className: 'text-base' },
  { value: 'large', label: 'Large', className: 'text-lg' },
]

const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  theme: 'system',
  fontSize: 'medium',
  compactMode: false,
  highContrast: false,
  reducedMotion: false,
  colorTheme: 'vibrant',
  sidebarCollapsed: false,
  showAvatars: true,
}

const extractAppearanceSettings = (
  payload: unknown
): Partial<AppearanceSettings> | null => {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Record<string, any>
  if (record?.appearanceSettings && typeof record.appearanceSettings === 'object') {
    return record.appearanceSettings as Partial<AppearanceSettings>
  }
  if (record?.data && typeof record.data === 'object') {
    const nested = (record.data as Record<string, any>).appearanceSettings
    if (nested && typeof nested === 'object') {
      return nested as Partial<AppearanceSettings>
    }
  }
  return null
}

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme()
  const { colorTheme, setColorTheme } = useAppearance()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [settings, setSettings] = useState<AppearanceSettings>({
    ...DEFAULT_APPEARANCE_SETTINGS,
  })
  const [mounted, setMounted] = useState(false)

  const applyAppearanceToDom = (nextSettings: AppearanceSettings) => {
    if (nextSettings.theme !== theme) {
      setTheme(nextSettings.theme)
    }
    if (nextSettings.colorTheme !== colorTheme) {
      setColorTheme(nextSettings.colorTheme)
    }

    document.documentElement.setAttribute('data-font-size', nextSettings.fontSize)
    document.documentElement.setAttribute(
      'data-compact',
      nextSettings.compactMode.toString()
    )
    document.documentElement.setAttribute(
      'data-sidebar-collapsed',
      nextSettings.sidebarCollapsed.toString()
    )
    document.documentElement.setAttribute(
      'data-show-avatars',
      nextSettings.showAvatars.toString()
    )
    if (nextSettings.reducedMotion) {
      document.documentElement.classList.add('reduce-motion')
    } else {
      document.documentElement.classList.remove('reduce-motion')
    }
    if (nextSettings.highContrast) {
      document.documentElement.classList.add('high-contrast')
    } else {
      document.documentElement.classList.remove('high-contrast')
    }

    localStorage.setItem('fontSize', nextSettings.fontSize)
    localStorage.setItem('compactMode', nextSettings.compactMode.toString())
    localStorage.setItem('reduceAnimations', nextSettings.reducedMotion.toString())
    localStorage.setItem('highContrast', nextSettings.highContrast.toString())
    localStorage.setItem('sidebarCollapsed', nextSettings.sidebarCollapsed.toString())
    localStorage.setItem('showAvatars', nextSettings.showAvatars.toString())
  }

  const normalizeAppearanceSettings = (
    next: Partial<AppearanceSettings>
  ): AppearanceSettings => {
    return {
      ...DEFAULT_APPEARANCE_SETTINGS,
      ...next,
      theme: next.theme ?? DEFAULT_APPEARANCE_SETTINGS.theme,
      fontSize: next.fontSize ?? DEFAULT_APPEARANCE_SETTINGS.fontSize,
      colorTheme: next.colorTheme ?? DEFAULT_APPEARANCE_SETTINGS.colorTheme,
      compactMode: Boolean(next.compactMode),
      highContrast: Boolean(next.highContrast),
      reducedMotion: Boolean(next.reducedMotion),
      sidebarCollapsed: Boolean(next.sidebarCollapsed),
      showAvatars: next.showAvatars ?? DEFAULT_APPEARANCE_SETTINGS.showAvatars,
    }
  }

  const updateSetting = <K extends keyof AppearanceSettings>(
    key: K,
    value: AppearanceSettings[K]
  ) => {
    setSettings((prev) => {
      const nextSettings = { ...prev, [key]: value }
      applyAppearanceToDom(nextSettings)
      return nextSettings
    })
    setHasChanges(true)
  }

  const fetchAppearanceSettings = async () => {
    try {
      const payload = await api.get('/users/appearance-settings')
      const savedSettings = extractAppearanceSettings(payload)
      const nextSettings = normalizeAppearanceSettings(savedSettings ?? {})
      setSettings(nextSettings)
      applyAppearanceToDom(nextSettings)
      setHasChanges(false)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load appearance settings'
    toast.error(message)
    } finally {
      setLoading(false)
      setMounted(true)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = await api.put('/users/appearance-settings', settings)
      const savedSettings = extractAppearanceSettings(payload)
      if (savedSettings) {
        const nextSettings = normalizeAppearanceSettings(savedSettings)
        setSettings(nextSettings)
        applyAppearanceToDom(nextSettings)
      }
      setHasChanges(false)
      toast.success('Appearance settings updated')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update appearance settings'
    toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const localTheme = localStorage.getItem('theme') || theme
    const localFontSize =
      localStorage.getItem('fontSize') || DEFAULT_APPEARANCE_SETTINGS.fontSize
    const localCompactMode = localStorage.getItem('compactMode') === 'true'
    const localReducedMotion = localStorage.getItem('reduceAnimations') === 'true'
    const localHighContrast = localStorage.getItem('highContrast') === 'true'
    const localSidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true'
    const localShowAvatars = localStorage.getItem('showAvatars') !== 'false'
    const localColorTheme =
      (localStorage.getItem('colorTheme') as ColorTheme) ||
      DEFAULT_APPEARANCE_SETTINGS.colorTheme

    const initialSettings = normalizeAppearanceSettings({
      theme: localTheme as Theme,
      fontSize: localFontSize as FontSize,
      compactMode: localCompactMode,
      highContrast: localHighContrast,
      reducedMotion: localReducedMotion,
      colorTheme: localColorTheme,
      sidebarCollapsed: localSidebarCollapsed,
      showAvatars: localShowAvatars,
    })

    setSettings(initialSettings)
    applyAppearanceToDom(initialSettings)
    fetchAppearanceSettings()
  }, [])

  if (loading || !mounted) {
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
        <h2 className="text-2xl font-bold text-foreground">Appearance</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Customize how DevSocial looks on your device
        </p>
      </div>

      {/* Theme */}
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Theme</h3>
          <p className="text-sm text-muted-foreground">
            Choose your preferred color scheme
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => updateSetting('theme', 'light')}
            className={cn(
              'relative flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all hover:border-primary/50',
              settings.theme === 'light'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-background'
            )}
          >
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-400 to-yellow-300 flex items-center justify-center">
              <Sun className="h-6 w-6 text-white" />
            </div>
            <span className="text-sm font-medium">Light</span>
            {theme === 'light' && (
              <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
            )}
          </button>

          <button
            onClick={() => updateSetting('theme', 'dark')}
            className={cn(
              'relative flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all hover:border-primary/50',
              settings.theme === 'dark'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-background'
            )}
          >
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Moon className="h-6 w-6 text-white" />
            </div>
            <span className="text-sm font-medium">Dark</span>
            {theme === 'dark' && (
              <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
            )}
          </button>

          <button
            onClick={() => updateSetting('theme', 'system')}
            className={cn(
              'relative flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all hover:border-primary/50',
              settings.theme === 'system'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-background'
            )}
          >
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
              <Monitor className="h-6 w-6 text-white" />
            </div>
            <span className="text-sm font-medium">System</span>
            {theme === 'system' && (
              <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
            )}
          </button>
        </div>
      </div>

      {/* Font Size */}
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Color Theme</h3>
          <p className="text-sm text-muted-foreground">
            Choose base UI styling accent family
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => updateSetting('colorTheme', 'vibrant')}
            className={cn(
              'relative flex items-center justify-between p-4 rounded-lg border-2 transition-all hover:border-primary/50',
              settings.colorTheme === 'vibrant'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-background'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center">
                <Palette className="h-4 w-4 text-white" />
              </div>
              <span className="font-medium">Vibrant</span>
            </div>
            {settings.colorTheme === 'vibrant' && (
              <div className="h-2 w-2 rounded-full bg-primary" />
            )}
          </button>

          <button
            onClick={() => updateSetting('colorTheme', 'classic')}
            className={cn(
              'relative flex items-center justify-between p-4 rounded-lg border-2 transition-all hover:border-primary/50',
              settings.colorTheme === 'classic'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-background'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-500 to-gray-700 flex items-center justify-center">
                <Palette className="h-4 w-4 text-white" />
              </div>
              <span className="font-medium">Classic</span>
            </div>
            {settings.colorTheme === 'classic' && (
              <div className="h-2 w-2 rounded-full bg-primary" />
            )}
          </button>
        </div>
      </div>

      {/* Font Size */}
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Font Size
          </h3>
          <p className="text-sm text-muted-foreground">
            Adjust text size across the app
          </p>
        </div>

        <RadioGroup
          value={settings.fontSize}
          onValueChange={(value) => updateSetting('fontSize', value as FontSize)}
        >
          <div className="space-y-3">
            {fontSizes.map((size) => (
              <div
                key={size.value}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value={size.value} id={size.value} />
                  <Label htmlFor={size.value} className="cursor-pointer">
                    <span className={cn('font-medium', size.className)}>
                      {size.label}
                    </span>
                  </Label>
                </div>
                <span className={cn('text-muted-foreground', size.className)}>
                  The quick brown fox
                </span>
              </div>
            ))}
          </div>
        </RadioGroup>
      </div>

      {/* Display Options */}
      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Display Options</h3>
          <p className="text-sm text-muted-foreground">
            Fine-tune your viewing experience
          </p>
        </div>

        {/* Compact Mode */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Minimize2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">Compact Mode</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                Reduce spacing and padding for a denser layout
              </p>
            </div>
          </div>
          <Switch
            checked={settings.compactMode}
            onCheckedChange={(checked) => updateSetting('compactMode', checked)}
          />
        </div>

        {/* Reduce Animations */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">Reduce Animations</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                Minimize motion and transitions for better performance
              </p>
            </div>
          </div>
          <Switch
            checked={settings.reducedMotion}
            onCheckedChange={(checked) => updateSetting('reducedMotion', checked)}
          />
        </div>

        {/* High Contrast */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Maximize2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">High Contrast</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                Increase visual contrast for easier readability
              </p>
            </div>
          </div>
          <Switch
            checked={settings.highContrast}
            onCheckedChange={(checked) => updateSetting('highContrast', checked)}
          />
        </div>

        {/* Sidebar Collapsed */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <LayoutList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">Sidebar Collapsed</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                Start with the navigation sidebar collapsed
              </p>
            </div>
          </div>
          <Switch
            checked={settings.sidebarCollapsed}
            onCheckedChange={(checked) =>
              updateSetting('sidebarCollapsed', checked)
            }
          />
        </div>

        {/* Show Avatars */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              {settings.showAvatars ? (
                <Eye className="h-5 w-5 text-primary" />
              ) : (
                <EyeOff className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <h4 className="font-medium text-foreground">Show Avatars</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                Render profile avatars in posts and lists
              </p>
            </div>
          </div>
          <Switch
            checked={settings.showAvatars}
            onCheckedChange={(checked) => updateSetting('showAvatars', checked)}
          />
        </div>
      </div>

      <div className="p-6 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {hasChanges ? 'You have unsaved changes.' : 'All changes saved.'}
        </p>
        <Button onClick={handleSave} disabled={saving || !hasChanges} size="lg">
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
