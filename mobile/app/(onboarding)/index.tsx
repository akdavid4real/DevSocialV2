import { useState } from 'react'
import { View, Text, ScrollView, Pressable, TextInput, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  User,
  Code,
  Sparkles,
  Award,
  Rocket,
  ChevronRight,
  ChevronLeft,
  Check,
} from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import Toast from 'react-native-toast-message'
import * as api from '@/lib/api'
import { unwrap } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'

const TECH_STACKS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#',
  'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin',
  'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Django',
  'Flask', 'Spring Boot', 'Docker', 'Kubernetes', 'AWS', 'Firebase',
]

const CAREER_PATHS = [
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'Mobile Developer', 'DevOps Engineer', 'Data Scientist',
  'ML Engineer', 'Cloud Architect', 'Security Engineer',
  'Product Manager', 'UI/UX Designer', 'Student',
]

const EXPERIENCE_LEVELS = [
  { label: 'Beginner', value: 'BEGINNER' },
  { label: 'Intermediate', value: 'INTERMEDIATE' },
  { label: 'Advanced', value: 'ADVANCED' },
  { label: 'Expert', value: 'EXPERT' },
]

const STEPS = [
  { icon: User, title: 'Profile Photo', subtitle: 'Add a photo so others can recognize you' },
  { icon: Code, title: 'Tech Profile', subtitle: 'Tell us about your tech background' },
  { icon: Sparkles, title: 'Interests', subtitle: 'Select technologies you work with' },
  { icon: Award, title: 'Almost there!', subtitle: 'Just a few more details' },
  { icon: Rocket, title: 'Welcome!', subtitle: "You're all set to explore DevSocial" },
]

export default function OnboardingScreen() {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [avatarUri, setAvatarUri] = useState<string | null>(null)
  const [bio, setBio] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [selectedTechStack, setSelectedTechStack] = useState<string[]>([])
  const [careerPath, setCareerPath] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('')
  const [githubUsername, setGithubUsername] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const { user, refreshUser } = useAuth()
  const router = useRouter()

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri)
    }
  }

  const toggleTech = (tech: string) => {
    setSelectedTechStack((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]
    )
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      // Upload avatar if selected
      let avatarUrl: string | undefined
      if (avatarUri) {
        const response = await api.uploadFile(avatarUri, 'avatar.jpg', 'image/jpeg')
        const data = unwrap(response)
        avatarUrl = data?.url
      }

      // Save profile fields (displayName, githubUsername, linkedinUrl) via profile endpoint
      const profileData: Record<string, any> = {}
      if (displayName) profileData.displayName = displayName
      if (githubUsername) profileData.githubUsername = githubUsername
      if (linkedinUrl) profileData.linkedinUrl = linkedinUrl
      if (avatarUrl) profileData.avatar = avatarUrl

      if (Object.keys(profileData).length > 0) {
        await api.updateProfile(profileData)
      }

      // Save onboarding fields — backend auto-sets onboardingCompleted when interests has items
      await api.updateOnboarding({
        bio: bio || undefined,
        avatar: avatarUrl || undefined,
        techStack: selectedTechStack.length > 0 ? selectedTechStack : undefined,
        techCareerPath: careerPath || undefined,
        experienceLevel: experienceLevel || undefined,
        interests: selectedTechStack.length > 0 ? selectedTechStack : ['General'],
      })

      await refreshUser()
      Toast.show({ type: 'success', text1: 'Welcome to DevSocial!' })
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err.message || 'Failed to complete onboarding' })
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (step === STEPS.length - 1) {
      handleComplete()
    } else {
      setStep((s) => s + 1)
    }
  }

  const prevStep = () => setStep((s) => Math.max(0, s - 1))

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View className="items-center gap-6">
            <Pressable onPress={pickAvatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} className="w-28 h-28 rounded-full" />
              ) : (
                <View className="w-28 h-28 rounded-full bg-surface-elevated border-2 border-dashed border-border items-center justify-center">
                  <User size={40} color="#71717A" />
                  <Text className="text-text-muted text-xs mt-1">Tap to add</Text>
                </View>
              )}
            </Pressable>
            <Input
              label="Display Name"
              placeholder={user?.username || 'Your display name'}
              value={displayName}
              onChangeText={setDisplayName}
            />
            <Input
              label="Bio"
              placeholder="Tell us about yourself..."
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              className="min-h-[80px]"
            />
          </View>
        )

      case 1:
        return (
          <View className="gap-5">
            <Text className="text-sm font-medium text-text-primary">Career Path</Text>
            <View className="flex-row flex-wrap gap-2">
              {CAREER_PATHS.map((path) => (
                <Pressable
                  key={path}
                  onPress={() => setCareerPath(path)}
                  className={`px-3 py-2 rounded-xl border ${
                    careerPath === path
                      ? 'bg-primary/20 border-primary'
                      : 'bg-surface-elevated border-border'
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      careerPath === path ? 'text-primary font-semibold' : 'text-text-secondary'
                    }`}
                  >
                    {path}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text className="text-sm font-medium text-text-primary mt-2">Experience Level</Text>
            <View className="flex-row flex-wrap gap-2">
              {EXPERIENCE_LEVELS.map((level) => (
                <Pressable
                  key={level.value}
                  onPress={() => setExperienceLevel(level.value)}
                  className={`px-3 py-2 rounded-xl border ${
                    experienceLevel === level.value
                      ? 'bg-primary/20 border-primary'
                      : 'bg-surface-elevated border-border'
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      experienceLevel === level.value ? 'text-primary font-semibold' : 'text-text-secondary'
                    }`}
                  >
                    {level.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )

      case 2:
        return (
          <View className="gap-3">
            <Text className="text-sm text-text-muted">
              Select technologies you work with ({selectedTechStack.length} selected)
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {TECH_STACKS.map((tech) => {
                const selected = selectedTechStack.includes(tech)
                return (
                  <Pressable
                    key={tech}
                    onPress={() => toggleTech(tech)}
                    className={`px-3 py-2 rounded-xl border flex-row items-center gap-1 ${
                      selected
                        ? 'bg-primary/20 border-primary'
                        : 'bg-surface-elevated border-border'
                    }`}
                  >
                    {selected && <Check size={12} color="#6366f1" />}
                    <Text
                      className={`text-sm ${
                        selected ? 'text-primary font-semibold' : 'text-text-secondary'
                      }`}
                    >
                      {tech}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        )

      case 3:
        return (
          <View className="gap-4">
            <Input
              label="GitHub Username"
              placeholder="your-github-username"
              value={githubUsername}
              onChangeText={setGithubUsername}
              autoCapitalize="none"
            />
            <Input
              label="LinkedIn URL"
              placeholder="https://linkedin.com/in/..."
              value={linkedinUrl}
              onChangeText={setLinkedinUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        )

      case 4:
        return (
          <View className="items-center gap-4 py-6">
            <Rocket size={64} color="#6366f1" />
            <Text className="text-2xl font-bold text-text-primary text-center">
              You're all set!
            </Text>
            <Text className="text-text-secondary text-center">
              Start exploring DevSocial, connect with developers, and share your journey.
            </Text>
          </View>
        )
    }
  }

  const StepIcon = STEPS[step].icon

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Progress */}
      <View className="flex-row px-4 pt-4 gap-1">
        {STEPS.map((_, i) => (
          <View
            key={i}
            className={`flex-1 h-1 rounded-full ${
              i <= step ? 'bg-primary' : 'bg-border'
            }`}
          />
        ))}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step Header */}
        <View className="items-center mb-8 mt-4">
          <View className="w-14 h-14 bg-primary/10 rounded-full items-center justify-center mb-3">
            <StepIcon size={28} color="#6366f1" />
          </View>
          <Text className="text-2xl font-bold text-text-primary">{STEPS[step].title}</Text>
          <Text className="text-text-secondary text-center mt-1">{STEPS[step].subtitle}</Text>
        </View>

        {renderStep()}
      </ScrollView>

      {/* Navigation */}
      <View className="flex-row items-center justify-between px-4 py-4 border-t border-border">
        {step > 0 ? (
          <Pressable onPress={prevStep} className="flex-row items-center gap-1">
            <ChevronLeft size={20} color="#A1A1AA" />
            <Text className="text-text-secondary font-medium">Back</Text>
          </Pressable>
        ) : (
          <View />
        )}

        <Button onPress={nextStep} loading={loading}>
          <View className="flex-row items-center gap-1">
            <Text className="text-white font-semibold">
              {step === STEPS.length - 1 ? 'Get Started' : 'Continue'}
            </Text>
            {step < STEPS.length - 1 && <ChevronRight size={18} color="#fff" />}
          </View>
        </Button>
      </View>
    </SafeAreaView>
  )
}
