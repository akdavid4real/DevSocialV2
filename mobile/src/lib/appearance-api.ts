import api from './api'

export type AppearanceSettings = {
  theme: 'light' | 'dark' | 'system'
  fontSize: 'small' | 'medium' | 'large'
  compactMode: boolean
  highContrast: boolean
  reducedMotion: boolean
  colorTheme: 'vibrant' | 'classic'
  sidebarCollapsed: boolean
  showAvatars: boolean
}

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  theme: 'system',
  fontSize: 'medium',
  compactMode: false,
  highContrast: false,
  reducedMotion: false,
  colorTheme: 'vibrant',
  sidebarCollapsed: false,
  showAvatars: true,
}

export async function getAppearanceSettings(): Promise<AppearanceSettings> {
  const result: any = await api.get('/users/appearance-settings')
  const payload = result?.data ?? result
  return {
    ...DEFAULT_APPEARANCE_SETTINGS,
    ...(payload?.appearanceSettings || payload || {}),
  }
}

export async function updateAppearanceSettings(
  settings: Partial<AppearanceSettings>,
): Promise<AppearanceSettings> {
  const result: any = await api.put('/users/appearance-settings', settings)
  const payload = result?.data ?? result
  return {
    ...DEFAULT_APPEARANCE_SETTINGS,
    ...(payload?.appearanceSettings || payload || settings),
  }
}
