import { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native'
import { Link, useRouter } from 'expo-router'
import { Eye, EyeOff, ChevronDown, Check } from 'lucide-react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/Card'
import * as api from '@/lib/api'

const AFFILIATION_TYPES = [
  { value: 'Top_Bootcamps_Tech_Programmes', label: 'Tech Bootcamps' },
  { value: 'Federal', label: 'Federal Universities' },
  { value: 'State', label: 'State Universities' },
  { value: 'Private', label: 'Private Universities' },
  { value: 'Affiliated_Institutions', label: 'Affiliated Institutions' },
  { value: 'Distance_Learning', label: 'Distance Learning' },
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function SignupScreen() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    birthMonth: '',
    birthDay: '',
    affiliation: '',
    affiliationType: 'Top_Bootcamps_Tech_Programmes',
  })
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [affiliations, setAffiliations] = useState<Record<string, string[]>>({})
  const [showAffiliationPicker, setShowAffiliationPicker] = useState(false)
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [showDayPicker, setShowDayPicker] = useState(false)
  const [showTypePicker, setShowTypePicker] = useState(false)

  const { signup } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const fetchAffiliations = async () => {
      try {
        const response = await api.getAffiliations()
        const data = (response as any)?.data || response
        setAffiliations(data || {})
      } catch {
        setAffiliations({})
      }
    }
    fetchAffiliations()
  }, [])

  const handleSignup = async () => {
    setError('')

    if (!formData.firstName.trim()) {
      Toast.show({ type: 'error', text1: 'First name is required' })
      return
    }
    if (!formData.lastName.trim()) {
      Toast.show({ type: 'error', text1: 'Last name is required' })
      return
    }
    if (!formData.username.trim()) {
      Toast.show({ type: 'error', text1: 'Username is required' })
      return
    }
    if (formData.password !== formData.confirmPassword) {
      Toast.show({ type: 'error', text1: 'Passwords do not match' })
      return
    }
    if (!acceptedTerms) {
      Toast.show({ type: 'error', text1: 'You must accept the terms' })
      return
    }

    setLoading(true)

    try {
      await signup({
        ...formData,
        birthMonth: parseInt(formData.birthMonth),
        birthDay: parseInt(formData.birthDay),
      })
      Toast.show({ type: 'success', text1: 'Account created! Check your email for a verification code.' })
      router.push({ pathname: '/(auth)/verify', params: { email: formData.email } })
    } catch (err: any) {
      const errorMessage = typeof err.message === 'object' && Array.isArray(err.message)
        ? err.message[0]
        : err.message || 'Signup failed'
      setError(errorMessage)
      Toast.show({ type: 'error', text1: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const currentAffiliations = affiliations[formData.affiliationType] || []

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Card>
            <CardHeader className="items-center">
              <View className="w-14 h-14 bg-primary/20 rounded-2xl items-center justify-center mb-4">
                <Text className="text-primary font-bold text-2xl">DS</Text>
              </View>
              <CardTitle className="text-center">Join DevSocial</CardTitle>
              <CardDescription className="text-center">
                Create your account and start connecting
              </CardDescription>
            </CardHeader>

            <CardContent className="gap-4">
              {error ? (
                <View className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                  <Text className="text-destructive text-sm">{error}</Text>
                </View>
              ) : null}

              {/* Name Row */}
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Input
                    label="First Name"
                    placeholder="John"
                    value={formData.firstName}
                    onChangeText={(v) => updateField('firstName', v)}
                    editable={!loading}
                  />
                </View>
                <View className="flex-1">
                  <Input
                    label="Last Name"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChangeText={(v) => updateField('lastName', v)}
                    editable={!loading}
                  />
                </View>
              </View>

              <Input
                label="Username"
                placeholder="Choose a unique username"
                value={formData.username}
                onChangeText={(v) => updateField('username', v)}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />

              <Input
                label="Email"
                placeholder="Enter your email address"
                value={formData.email}
                onChangeText={(v) => updateField('email', v)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />

              {/* Birthday Row */}
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-text-primary mb-1.5">Birth Month</Text>
                  <Pressable
                    onPress={() => setShowMonthPicker(!showMonthPicker)}
                    className="bg-surface border border-border rounded-xl px-4 py-3 flex-row items-center justify-between"
                  >
                    <Text className={formData.birthMonth ? 'text-text-primary' : 'text-text-muted'}>
                      {formData.birthMonth ? MONTHS[parseInt(formData.birthMonth) - 1] : 'Month'}
                    </Text>
                    <ChevronDown size={16} color="#71717A" />
                  </Pressable>
                  {showMonthPicker && (
                    <View className="bg-surface-elevated border border-border rounded-xl mt-1 max-h-48 overflow-hidden">
                      <ScrollView nestedScrollEnabled>
                        {MONTHS.map((month, i) => (
                          <Pressable
                            key={month}
                            onPress={() => {
                              updateField('birthMonth', (i + 1).toString())
                              setShowMonthPicker(false)
                            }}
                            className="px-4 py-2.5 border-b border-border"
                          >
                            <Text className="text-text-primary text-sm">{month}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-text-primary mb-1.5">Birth Day</Text>
                  <Pressable
                    onPress={() => setShowDayPicker(!showDayPicker)}
                    className="bg-surface border border-border rounded-xl px-4 py-3 flex-row items-center justify-between"
                  >
                    <Text className={formData.birthDay ? 'text-text-primary' : 'text-text-muted'}>
                      {formData.birthDay || 'Day'}
                    </Text>
                    <ChevronDown size={16} color="#71717A" />
                  </Pressable>
                  {showDayPicker && (
                    <View className="bg-surface-elevated border border-border rounded-xl mt-1 max-h-48 overflow-hidden">
                      <ScrollView nestedScrollEnabled>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <Pressable
                            key={day}
                            onPress={() => {
                              updateField('birthDay', day.toString())
                              setShowDayPicker(false)
                            }}
                            className="px-4 py-2.5 border-b border-border"
                          >
                            <Text className="text-text-primary text-sm">{day}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              {/* Affiliation Type */}
              <View>
                <Text className="text-sm font-medium text-text-primary mb-1.5">Affiliation Type</Text>
                <Pressable
                  onPress={() => setShowTypePicker(!showTypePicker)}
                  className="bg-surface border border-border rounded-xl px-4 py-3 flex-row items-center justify-between"
                >
                  <Text className="text-text-primary text-base">
                    {AFFILIATION_TYPES.find((t) => t.value === formData.affiliationType)?.label}
                  </Text>
                  <ChevronDown size={16} color="#71717A" />
                </Pressable>
                {showTypePicker && (
                  <View className="bg-surface-elevated border border-border rounded-xl mt-1">
                    {AFFILIATION_TYPES.map((type) => (
                      <Pressable
                        key={type.value}
                        onPress={() => {
                          updateField('affiliationType', type.value)
                          updateField('affiliation', '')
                          setShowTypePicker(false)
                        }}
                        className="px-4 py-2.5 border-b border-border flex-row items-center"
                      >
                        {formData.affiliationType === type.value && (
                          <Check size={14} color="#6366f1" className="mr-2" />
                        )}
                        <Text className="text-text-primary text-sm">{type.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* Affiliation */}
              <View>
                <Text className="text-sm font-medium text-text-primary mb-1.5">Affiliation</Text>
                <Pressable
                  onPress={() => setShowAffiliationPicker(!showAffiliationPicker)}
                  className="bg-surface border border-border rounded-xl px-4 py-3 flex-row items-center justify-between"
                >
                  <Text className={formData.affiliation ? 'text-text-primary' : 'text-text-muted'}>
                    {formData.affiliation || 'Select your affiliation...'}
                  </Text>
                  <ChevronDown size={16} color="#71717A" />
                </Pressable>
                {showAffiliationPicker && currentAffiliations.length > 0 && (
                  <View className="bg-surface-elevated border border-border rounded-xl mt-1 max-h-48 overflow-hidden">
                    <ScrollView nestedScrollEnabled>
                      {currentAffiliations.map((aff) => (
                        <Pressable
                          key={aff}
                          onPress={() => {
                            updateField('affiliation', aff)
                            setShowAffiliationPicker(false)
                          }}
                          className="px-4 py-2.5 border-b border-border flex-row items-center"
                        >
                          {formData.affiliation === aff && (
                            <Check size={14} color="#6366f1" className="mr-2" />
                          )}
                          <Text className="text-text-primary text-sm">{aff}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Password */}
              <View>
                <Text className="text-sm font-medium text-text-primary mb-1.5">Password</Text>
                <View className="relative">
                  <Input
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChangeText={(v) => updateField('password', v)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3"
                  >
                    {showPassword ? (
                      <EyeOff size={20} color="#71717A" />
                    ) : (
                      <Eye size={20} color="#71717A" />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Confirm Password */}
              <View>
                <Text className="text-sm font-medium text-text-primary mb-1.5">Confirm Password</Text>
                <View className="relative">
                  <Input
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChangeText={(v) => updateField('confirmPassword', v)}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} color="#71717A" />
                    ) : (
                      <Eye size={20} color="#71717A" />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Terms */}
              <Pressable
                onPress={() => setAcceptedTerms(!acceptedTerms)}
                className="flex-row items-start gap-3"
              >
                <View
                  className={`w-5 h-5 rounded border mt-0.5 items-center justify-center ${
                    acceptedTerms ? 'bg-primary border-primary' : 'border-border'
                  }`}
                >
                  {acceptedTerms && <Check size={14} color="#fff" />}
                </View>
                <Text className="text-sm text-text-secondary flex-1">
                  I agree to the Terms of Service and Privacy Policy
                </Text>
              </Pressable>

              <Button
                onPress={handleSignup}
                loading={loading}
                disabled={!acceptedTerms}
              >
                Create account
              </Button>

              <View className="items-center mt-4">
                <Text className="text-sm text-text-secondary">
                  Already have an account?{' '}
                  <Link href="/(auth)/login" className="text-primary font-semibold">
                    Sign in
                  </Link>
                </Text>
              </View>
            </CardContent>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
