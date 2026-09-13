import { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native'
import { Link, useLocalSearchParams, useRouter } from 'expo-router'
import { Mail, CheckCircle, ArrowLeft, RefreshCw } from 'lucide-react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/Card'

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>()
  const router = useRouter()
  const { verifyOtp } = useAuth()

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verified, setVerified] = useState(false)
  const [resending, setResending] = useState(false)

  const inputRefs = useRef<(TextInput | null)[]>([])

  useEffect(() => {
    setTimeout(() => {
      inputRefs.current[0]?.focus()
    }, 300)
  }, [])

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return

    const newOtp = [...otp]
    newOtp[index] = value.substring(value.length - 1)
    setOtp(newOtp)

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    if (index === 5 && value) {
      handleVerify(newOtp.join(''))
    }
  }

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async (token: string) => {
    if (token.length !== 6) return

    setLoading(true)
    setError(null)

    try {
      await verifyOtp(email || '', token)
      setVerified(true)
      Toast.show({ type: 'success', text1: 'Email verified!' })
    } catch (err: any) {
      const msg = err.message || 'Invalid verification code'
      setError(msg)
      Toast.show({ type: 'error', text1: msg })
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    Toast.show({ type: 'info', text1: 'Resending verification code...' })
    setTimeout(() => {
      Toast.show({ type: 'success', text1: 'Code resent to your email!' })
      setResending(false)
    }, 1500)
  }

  if (verified) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-5">
        <Animated.View entering={ZoomIn.springify()} className="items-center gap-4">
          <CheckCircle size={80} color="#22c55e" />
          <Text className="text-3xl font-bold text-text-primary">Email Verified!</Text>
          <Text className="text-text-secondary text-center">
            Your account is now ready. Redirecting...
          </Text>
          <RefreshCw size={24} color="#6366f1" className="mt-4" />
        </Animated.View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center px-5"
      >
        <Card>
          <CardHeader className="items-center">
            <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center mb-3">
              <Mail size={32} color="#6366f1" />
            </View>
            <CardTitle className="text-center">Verify Your Email</CardTitle>
            <CardDescription className="text-center">
              We've sent a 6-digit code to{'\n'}
              <Text className="text-primary font-medium">{email || 'your email'}</Text>
            </CardDescription>
          </CardHeader>

          <CardContent className="gap-6">
            {/* OTP Inputs */}
            <View className="flex-row justify-between px-2 gap-2">
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el }}
                  value={digit}
                  onChangeText={(value) => handleChange(index, value)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={1}
                  className="w-12 h-14 text-center text-2xl font-bold bg-surface-elevated border border-border rounded-xl text-text-primary"
                  editable={!loading}
                  selectTextOnFocus
                />
              ))}
            </View>

            {error && (
              <Animated.View
                entering={FadeIn}
                className="bg-destructive/10 border border-destructive/20 rounded-xl p-3"
              >
                <Text className="text-destructive text-sm">{error}</Text>
              </Animated.View>
            )}

            <Button
              onPress={() => handleVerify(otp.join(''))}
              loading={loading}
              disabled={otp.some((d) => !d)}
              className="mt-2"
            >
              Verify Account
            </Button>
          </CardContent>

          <CardFooter className="items-center gap-4">
            <Text className="text-sm text-text-secondary">
              Didn't receive the code?{' '}
              <Text
                onPress={handleResend}
                className="text-primary font-semibold"
              >
                {resending ? 'Sending...' : 'Resend Code'}
              </Text>
            </Text>

            <Link href="/(auth)/signup" asChild>
              <Pressable className="flex-row items-center gap-2">
                <ArrowLeft size={16} color="#A1A1AA" />
                <Text className="text-sm text-text-secondary">Back to Signup</Text>
              </Pressable>
            </Link>
          </CardFooter>
        </Card>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
