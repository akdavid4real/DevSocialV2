"use client"

import { useState, useEffect } from "react"
import { usePathname } from "@/lib/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useNotifications } from "@/contexts/notification-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import Link from "@/components/ui/link"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import {
    Home,
    Search,
    Compass,
    Route,
    Users2,
    FolderGit2,
    BookOpen,
    MessageSquareText,
    Gift,
    Target,
    Trophy,
    User,
    LogOut,
    Bell,
    Plus,
    MessageSquare,
    Shield,
    Settings
} from "lucide-react"

type NavItem = {
    label: string
    icon: any
    href: string
    badge?: string
}

const navItems: NavItem[] = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Messages", icon: MessageSquare, href: "/messages" },
    { label: "Notifications", icon: Bell, href: "/notifications" },
    { label: "Search", icon: Search, href: "/search" },
    { label: "Communities", icon: Users2, href: "/communities" },
    { label: "Career Paths", icon: Route, href: "/career-paths" },
    { label: "Projects", icon: FolderGit2, href: "/projects" },
    { label: "Knowledge", icon: BookOpen, href: "/knowledge-bank" },
    { label: "Feedback", icon: MessageSquareText, href: "/feedback" },
    { label: "Challenges", icon: Target, href: "/challenges" },
    { label: "Referrals", icon: Gift, href: "/referrals" },
    { label: "Trending", icon: Compass, href: "/trending" },
    { label: "Leaderboard", icon: Trophy, href: "/leaderboard" },
    { label: "Settings", icon: Settings, href: "/settings" },
]

export default function SideNav() {
    const pathname = usePathname()
    const { user, logout } = useAuth()
    const { unreadCount } = useNotifications()
    const [active, setActive] = useState(pathname)
    const canAccessAdmin = user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'MODERATOR'

    useEffect(() => {
        setActive(pathname)
    }, [pathname])

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center gap-2 px-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 text-sm font-bold">
                    {"</>"}
                </div>
                <div className="grid">
                    <span className="text-sm font-bold leading-none">DevSocial</span>
                    <span className="text-xs text-muted-foreground">Connect • Level Up</span>
                </div>
            </div>

            <Card className="bg-card border-border p-3 mx-2">
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback>{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="truncate text-xs font-bold text-foreground">{user?.displayName || user?.username}</span>
                            <Badge variant="secondary" className="h-4 px-1 text-xs font-bold">L{user?.level || 1}</Badge>
                        </div>
                        <div className="text-xs font-medium text-muted-foreground">{user?.points || 0} XP</div>
                    </div>
                </div>
            </Card>

            <ScrollArea className="flex-1 px-2">
                <nav className="space-y-1">
                    {navItems.map((item) => {
                        const href = item.href;
                        const isNotifications = item.href === '/notifications';

                        return (
                            <Link
                                key={item.label}
                                href={href}
                                className={cn(
                                    "group flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200",
                                    active === href
                                        ? "bg-primary/10 text-primary ring-1 ring-primary/20 shadow-sm"
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        "h-4 w-4 transition-colors",
                                        active === href ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                    )}
                                />
                                <span className="flex-1 truncate">{item.label}</span>
                                {isNotifications && unreadCount > 0 && (
                                    <Badge className="ml-auto h-4 rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </Badge>
                                )}
                                {item.badge && !isNotifications && (
                                    <Badge className="ml-auto h-4 rounded-full bg-primary/20 px-1.5 text-xs font-bold text-primary">
                                        {item.badge}
                                    </Badge>
                                )}
                            </Link>
                        );
                    })}
                    
                    {/* My Profile Link - Dynamic */}
                    {user?.username && (
                        <Link
                            href={`/@${user.username}`}
                            className={cn(
                                "group flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200",
                                active === `/@${user.username}`
                                    ? "bg-primary/10 text-primary ring-1 ring-primary/20 shadow-sm"
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                        >
                            <User
                                className={cn(
                                    "h-4 w-4 transition-colors",
                                    active === `/@${user.username}` ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                )}
                            />
                            <span className="flex-1 truncate">My Profile</span>
                        </Link>
                    )}

                    {/* Admin Panel Link - Only for Admins/Moderators */}
                    {canAccessAdmin && (
                        <>
                            <Link
                                href="/moderation"
                                className={cn(
                                    "group flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200",
                                    active?.startsWith('/moderation')
                                        ? "bg-primary/10 text-primary ring-1 ring-primary/20 shadow-sm"
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                <Shield
                                    className={cn(
                                        "h-4 w-4 transition-colors",
                                        active?.startsWith('/moderation') ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                    )}
                                />
                                <span className="flex-1 truncate">Moderation</span>
                            </Link>
                            <Link
                                href="/admin"
                                className={cn(
                                    "group flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200",
                                    active?.startsWith('/admin')
                                        ? "bg-red-500/10 text-red-500 ring-1 ring-red-500/20 shadow-sm"
                                        : "text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                                )}
                            >
                                <Shield
                                    className={cn(
                                        "h-4 w-4 transition-colors",
                                        active?.startsWith('/admin') ? "text-red-500" : "text-muted-foreground group-hover:text-red-500"
                                    )}
                                />
                                <span className="flex-1 truncate">Admin Panel</span>
                            </Link>
                        </>
                    )}
                </nav>
            </ScrollArea>

            <div className="px-2 pb-4 space-y-4">
                <div className="grid gap-2">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-3">Quick Actions</div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            className="flex-1 h-8 rounded-xl text-xs font-bold shadow-sm shadow-primary/20"
                            onClick={() => window.openPostModal?.()}
                        >
                            <Plus className="mr-1.5 h-3 w-3" /> Create
                        </Button>
                        <ThemeToggle />
                    </div>
                </div>

                <Separator className="bg-border" />

                <div className="grid gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={logout}
                        className="justify-start gap-3 rounded-xl px-3 text-xs font-medium text-red-400 hover:text-red-400 hover:bg-red-400/10"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </Button>
                </div>
            </div>
        </div>
    )
}
