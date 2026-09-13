import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { Link } from 'expo-router'
import { Eye, EyeOff } from 'lucide-react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginScreen() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()

  const handleLogin = async () => {
    setError('')
    setLoading(true)

    try {
      await login({ usernameOrEmail, password })
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.flex}
      >
        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={s.logoBox}>
            <Text style={s.logoText}>DS</Text>
          </View>

          {/* Title */}
          <Text style={s.title}>Welcome back</Text>
          <Text style={s.subtitle}>Sign in to your DevSocial account</Text>

          {/* Card */}
          <View style={s.card}>
            {error ? (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Username/Email */}
            <Text style={s.label}>Username or Email</Text>
            <TextInput
              style={s.input}
              placeholder="Enter your username or email"
              placeholderTextColor="#71717A"
              value={usernameOrEmail}
              onChangeText={setUsernameOrEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!loading}
            />

            {/* Password */}
            <Text style={s.label}>Password</Text>
            <View>
              <TextInput
                style={s.input}
                placeholder="Enter your password"
                placeholderTextColor="#71717A"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={s.eyeBtn}
              >
                {showPassword ? (
                  <EyeOff size={20} color="#71717A" />
                ) : (
                  <Eye size={20} color="#71717A" />
                )}
              </Pressable>
            </View>

            {/* Login Button */}
            <Pressable
              onPress={handleLogin}
              disabled={loading || !usernameOrEmail || !password}
              style={[
                s.button,
                (!usernameOrEmail || !password) && s.buttonDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.buttonText}>Sign In</Text>
              )}
            </Pressable>

            {/* Signup link */}
            <View style={s.linkRow}>
              <Text style={s.linkText}>Don't have an account? </Text>
              <Link href="/(auth)/signup">
                <Text style={s.linkAction}>Sign up</Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0B' },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  logoBox: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: 'rgba(99,102,241,0.2)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 16,
  },
  logoText: { color: '#6366f1', fontWeight: 'bold', fontSize: 22 },
  title: { color: '#FAFAFA', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { color: '#A1A1AA', fontSize: 14, textAlign: 'center', marginTop: 4, marginBottom: 24 },
  card: {
    backgroundColor: '#141416', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#27272A',
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)', borderRadius: 12, padding: 12, marginBottom: 12,
  },
  errorText: { color: '#EF4444', fontSize: 13 },
  label: { color: '#FAFAFA', fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#1C1C1F', borderRadius: 12, padding: 14,
    color: '#FAFAFA', fontSize: 15, borderWidth: 1, borderColor: '#27272A',
  },
  eyeBtn: { position: 'absolute', right: 14, top: 14 },
  button: {
    backgroundColor: '#6366f1', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 20,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  linkText: { color: '#A1A1AA', fontSize: 13 },
  linkAction: { color: '#6366f1', fontSize: 13, fontWeight: '600' },
})
