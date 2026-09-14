'use client'

import { usePathname } from '@/lib/navigation'
import Link from '@/components/ui/link'
import { cn } from '@/lib/utils'
import {
  User,
  UserCircle,
  Palette,
  Lock,
  Bell,
  Sparkles,
  UserX,
  UserPlus,
  Shield,
  ChevronRight,
} from 'lucide-react'

const settingsSections = [
  {
    label: 'Account',
    href: '/settings/account',
    icon: User,
    description: 'Email, password, and account management',
  },
  {
    label: 'Profile',
    href: '/settings/profile',
    icon: UserCircle,
    description: 'Public profile, bio, and links',
  },
  {
    label: 'Appearance',
    href: '/settings/appearance',
    icon: Palette,
    description: 'Theme, font size, and display',
  },
  {
    label: 'Privacy',
    href: '/settings/privacy',
    icon: Lock,
    description: 'Control who can see your content',
  },
  {
    label: 'Follow Requests',
    href: '/settings/follow-requests',
    icon: UserPlus,
    description: 'Approve access to a private profile',
  },
  {
    label: 'Notifications',
    href: '/settings/notifications',
    icon: Bell,
    description: 'Email and push notification preferences',
  },
  {
    label: 'AI Usage',
    href: '/settings/ai-usage',
    icon: Sparkles,
    description: 'Monthly AI feature limits and usage',
  },
  {
    label: 'Blocked Users',
    href: '/settings/blocked-users',
    icon: UserX,
    description: 'Manage blocked accounts',
  },
  {
    label: 'Security',
    href: '/settings/security',
    icon: Shield,
    description: 'Sessions and login activity',
  },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <nav className="space-y-1">
              {settingsSections.map((section) => {
                const Icon = section.icon
                const isActive = pathname === section.href

                return (
                  <Link
                    key={section.href}
                    href={section.href}
                    className={cn(
                      'flex items-center justify-between px-4 py-3 rounded-lg transition-colors group',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <div className="hidden sm:block">
                        <div className="font-medium text-sm">{section.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{section.description}</div>
                      </div>
                      <div className="sm:hidden font-medium text-sm">{section.label}</div>
                    </div>
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 flex-shrink-0 transition-transform',
                        isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
                      )}
                    />
                  </Link>
                )
              })}
            </nav>
          </aside>

          <main className="min-w-0">
            <div className="bg-card border border-border rounded-lg">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
