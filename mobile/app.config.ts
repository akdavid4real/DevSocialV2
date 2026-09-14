import { ExpoConfig, ConfigContext } from 'expo/config'

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'DevSocial',
  slug: 'devsocial',
  scheme: 'devsocial',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0A0A0B',
  },
  android: {
    package: 'com.devsocial.app',
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
      backgroundColor: '#0A0A0B',
    },
  },
  ios: {
    bundleIdentifier: 'com.devsocial.app',
    supportsTablet: true,
  },
  extra: {
    ...config.extra,
    eas: {
      ...(config.extra?.eas || {}),
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || config.extra?.eas?.projectId,
    },
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-notifications',
      {
        icon: './assets/android-icon-monochrome.png',
        color: '#6366f1',
        defaultChannel: 'default',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          usesCleartextTraffic: process.env.NODE_ENV !== 'production',
        },
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow DevSocial to access your photos.',
        cameraPermission: 'Allow DevSocial to access your camera.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
})
