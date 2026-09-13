'use client'

import { useState, useEffect } from 'react'
import { User, Link as LinkIcon, Github, Linkedin, Globe, Briefcase, Code, Loader2, Upload, X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { API_BASE_URL } from '@/lib/env'
import RPMAvatarModal from '@/components/modals/RPMAvatarModal'

const TECH_STACKS = [
  'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Express', 'NestJS',
  'Python', 'Django', 'Flask', 'FastAPI', 'Go', 'Rust', 'Java', 'Spring Boot',
  'Ruby', 'Rails', 'PHP', 'Laravel', 'PostgreSQL', 'MySQL', 'MongoDB',
  'Redis', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'TypeScript',
  'JavaScript', 'HTML', 'CSS', 'Tailwind', 'GraphQL', 'REST API'
]

const CAREER_PATHS = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Mobile Developer',
  'DevOps Engineer',
  'Data Scientist',
  'ML Engineer',
  'UI/UX Designer',
  'Product Manager',
  'Tech Lead',
  'Engineering Manager',
  'Student',
  'Other'
]

const EXPERIENCE_LEVELS = [
  { value: 'BEGINNER', label: 'Beginner (0-1 years)' },
  { value: 'INTERMEDIATE', label: 'Intermediate (1-3 years)' },
  { value: 'ADVANCED', label: 'Advanced (3-5 years)' },
  { value: 'EXPERT', label: 'Expert (5+ years)' },
]

export default function ProfileSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [savingReadyPlayerAvatar, setSavingReadyPlayerAvatar] = useState(false)
  const [showReadyPlayerModal, setShowReadyPlayerModal] = useState(false)

  // Profile data
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [location, setLocation] = useState('')

  // Tech profile
  const [techCareerPath, setTechCareerPath] = useState('')
  const [techStack, setTechStack] = useState<string[]>([])
  const [experienceLevel, setExperienceLevel] = useState('BEGINNER')
  const [githubUsername, setGithubUsername] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')

  // Tech stack input
  const [techStackInput, setTechStackInput] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const { data } = await res.json()
        setUsername(data.username || '')
        setDisplayName(data.displayName || '')
        setBio(data.bio || '')
        setAvatar(data.avatar || '')
        setBannerUrl(data.bannerUrl || '')
        setLocation(data.location || '')
        setTechCareerPath(data.techCareerPath || '')
        setTechStack(data.techStack || [])
        setExperienceLevel(data.experienceLevel || 'BEGINNER')
        setGithubUsername(data.githubUsername || '')
        setLinkedinUrl(data.linkedinUrl || '')
        setPortfolioUrl(data.portfolioUrl || '')
      }
    } catch (error) {
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    setUploadingAvatar(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (res.ok) {
        const response = await res.json()
        const url = response.data?.url || response.url
        setAvatar(url)
        toast.success('Avatar uploaded successfully')
      } else {
        const error = await res.json()
        toast.error(error.message || 'Failed to upload avatar')
      }
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (10MB max for banner)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB')
      return
    }

    setUploadingBanner(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (res.ok) {
        const response = await res.json()
        const url = response.data?.url || response.url
        setBannerUrl(url)
        toast.success('Banner uploaded successfully')
      } else {
        const error = await res.json()
        toast.error(error.message || 'Failed to upload banner')
      }
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setUploadingBanner(false)
    }
  }

  const handleReadyPlayerAvatar = async (avatarUrl: string) => {
    setSavingReadyPlayerAvatar(true)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE_URL}/users/avatar/ready-player-me`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avatarUrl }),
      })

      const payload = await res.json()

      if (!res.ok) {
        toast.error(payload.message || 'Failed to save avatar')
        return
      }

      const normalizedAvatar = payload.data?.avatarUrl || payload.avatarUrl
      setAvatar(normalizedAvatar)
      toast.success('3D avatar saved successfully')
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setSavingReadyPlayerAvatar(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName,
          bio,
          avatar,
          bannerUrl,
          location,
          techCareerPath,
          techStack,
          experienceLevel,
          githubUsername,
          linkedinUrl,
          portfolioUrl,
        }),
      })

      if (res.ok) {
        toast.success('Profile updated successfully')
      } else {
        const error = await res.json()
        toast.error(error.message || 'Failed to update profile')
      }
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const addTechStack = (tech: string) => {
    if (!techStack.includes(tech)) {
      setTechStack([...techStack, tech])
    }
    setTechStackInput('')
  }

  const removeTechStack = (tech: string) => {
    setTechStack(techStack.filter((t) => t !== tech))
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

  const filteredTechStacks = TECH_STACKS.filter((tech) =>
    tech.toLowerCase().includes(techStackInput.toLowerCase()) &&
    !techStack.includes(tech)
  )

  return (
    <div className="divide-y divide-border">
      {/* Header */}
      <div className="p-6">
        <h2 className="text-2xl font-bold text-foreground">Profile Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Customize your public profile information
        </p>
      </div>

      {/* Username (Read-only) */}
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Username</h3>
          <p className="text-sm text-muted-foreground">
            Your unique identifier on DevSocial
          </p>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/30">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">@{username}</p>
            <p className="text-xs text-muted-foreground">
              Usernames cannot be changed
            </p>
          </div>
        </div>
      </div>

      {/* Avatar & Banner */}
      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Profile Images</h3>

          {/* Avatar */}
          <div className="space-y-3">
            <Label>Profile Picture</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 ring-2 ring-border">
                <AvatarImage src={avatar} />
                <AvatarFallback>
                  <User className="h-10 w-10" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingAvatar}
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                  >
                    {uploadingAvatar ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Image
                      </>
                    )}
                  </Button>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={savingReadyPlayerAvatar}
                    onClick={() => setShowReadyPlayerModal(true)}
                  >
                    {savingReadyPlayerAvatar ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Create 3D Avatar
                      </>
                    )}
                  </Button>
                </div>
                <Input
                  placeholder="Or paste image URL"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: Square image, at least 400x400px (Max 5MB)
                </p>
              </div>
            </div>
          </div>

          {/* Banner */}
          <div className="space-y-3 mt-6">
            <Label>Banner Image</Label>
            {bannerUrl && (
              <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border mb-2">
                <img src={bannerUrl} alt="Banner preview" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingBanner}
                  onClick={() => document.getElementById('banner-upload')?.click()}
                >
                  {uploadingBanner ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Banner
                    </>
                  )}
                </Button>
                <input
                  id="banner-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBannerUpload}
                />
              </div>
              <Input
                placeholder="Or paste image URL"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 1500x500px or 3:1 ratio (Max 10MB)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Basic Information</h3>
          <p className="text-sm text-muted-foreground">
            Tell others about yourself
          </p>
        </div>

        <div className="space-y-4 max-w-2xl">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              placeholder="John Doe"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell us about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={250}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {bio.length}/250
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="Lagos, Nigeria"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tech Profile */}
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Tech Profile</h3>
          <p className="text-sm text-muted-foreground">
            Showcase your technical expertise
          </p>
        </div>

        <div className="space-y-4 max-w-2xl">
          <div className="space-y-2">
            <Label htmlFor="careerPath">Career Path</Label>
            <Select value={techCareerPath} onValueChange={setTechCareerPath}>
              <SelectTrigger id="careerPath">
                <SelectValue placeholder="Select your career path" />
              </SelectTrigger>
              <SelectContent>
                {CAREER_PATHS.map((path) => (
                  <SelectItem key={path} value={path}>
                    {path}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="experienceLevel">Experience Level</Label>
            <Select value={experienceLevel} onValueChange={setExperienceLevel}>
              <SelectTrigger id="experienceLevel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="techStack">Tech Stack</Label>
            <div className="space-y-2">
              <Input
                id="techStack"
                placeholder="Search technologies..."
                value={techStackInput}
                onChange={(e) => setTechStackInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && techStackInput.trim()) {
                    e.preventDefault()
                    addTechStack(techStackInput.trim())
                  }
                }}
              />
              {techStackInput && filteredTechStacks.length > 0 && (
                <div className="border border-border rounded-lg p-2 max-h-40 overflow-y-auto">
                  <div className="flex flex-wrap gap-1">
                    {filteredTechStacks.slice(0, 10).map((tech) => (
                      <Button
                        key={tech}
                        variant="ghost"
                        size="sm"
                        onClick={() => addTechStack(tech)}
                        className="text-xs h-7"
                      >
                        {tech}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {techStack.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {techStack.map((tech) => (
                    <Badge key={tech} variant="secondary" className="gap-1">
                      {tech}
                      <button
                        onClick={() => removeTechStack(tech)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Links</h3>
          <p className="text-sm text-muted-foreground">
            Connect your professional profiles
          </p>
        </div>

        <div className="space-y-4 max-w-2xl">
          <div className="space-y-2">
            <Label htmlFor="github" className="flex items-center gap-2">
              <Github className="h-4 w-4" />
              GitHub Username
            </Label>
            <Input
              id="github"
              placeholder="username"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin" className="flex items-center gap-2">
              <Linkedin className="h-4 w-4" />
              LinkedIn URL
            </Label>
            <Input
              id="linkedin"
              placeholder="https://linkedin.com/in/username"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="portfolio" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Portfolio URL
            </Label>
            <Input
              id="portfolio"
              placeholder="https://yourportfolio.com"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
            />
          </div>
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

      <RPMAvatarModal
        isOpen={showReadyPlayerModal}
        onClose={() => setShowReadyPlayerModal(false)}
        onAvatarExported={handleReadyPlayerAvatar}
      />
    </div>
  )
}
