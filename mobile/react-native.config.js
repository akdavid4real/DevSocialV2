module.exports = {
  dependencies: {
    'react-native-worklets': {
      platforms: {
        android: null, // Exclude from Android native build (incompatible with RN 0.79.6)
        ios: null,
      },
    },
  },
}
