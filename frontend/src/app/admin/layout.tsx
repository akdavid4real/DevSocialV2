"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "@/lib/navigation"
import { useEffect } from "react"
import Link from "@/components/ui/link"
import { usePathname } from "@/lib/navigation"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import {
  LayoutDashboard,
  Users,
  FileText,
  Flag,
  FileCode,
  Shield,
  ShieldCheck,
  BotMessageSquare,
  Home,
  LogOut,
  Bot
} from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const canAccessAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR'

  useEffect(() => {
    if (!loading && !canAccessAdmin) {
      router.push('/')
    }
  }, [canAccessAdmin, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-sm">Loading...</div>
      </div>
    )
  }

  if (!canAccessAdmin) return null

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Posts', href: '/admin/posts', icon: FileText },
    { name: 'Reports', href: '/admin/reports', icon: Flag },
    ...(user?.role === 'ADMIN' ? [
      { name: 'Roles', href: '/admin/roles', icon: ShieldCheck },
      { name: 'Bots', href: '/admin/bots', icon: BotMessageSquare },
      { name: 'AI Logs', href: '/admin/ai-logs', icon: Bot },
      { name: 'Audit Logs', href: '/admin/audit', icon: FileCode },
    ] : []),
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-6 gap-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/30 text-sm font-bold">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold leading-none">Admin Panel</div>
              <div className="text-xs text-muted-foreground">DevSocial</div>
            </div>
          </div>

          <nav className="flex gap-1 flex-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive ? 'bg-red-500/10 text-red-500' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline" size="sm">
                <Home className="h-4 w-4 mr-2" />
                Back to Site
              </Button>
            </Link>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={logout} className="text-red-400 hover:text-red-400 hover:bg-red-400/10">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-[1600px]">{children}</main>
    </div>
  )
}
