"use client"

import { useAuth } from "@/contexts/auth-context"
import { Search, MessageSquare, Menu, User, LogOut, Settings, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NotificationBell } from "@/components/notifications/notification-bell"
import Link from "@/components/ui/link"

export default function Navbar() {
    const { user, logout } = useAuth()

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/60 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                {/* Logo */}
                <div className="flex items-center gap-2 sm:gap-4">
                    <Menu className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground lg:hidden" />
                    <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tighter bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                        DevSocial
                    </h1>
                </div>

                {/* Search */}
                <div className="hidden flex-1 px-4 md:px-6 lg:px-8 lg:block max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search developers, projects, and posts..."
                            className="w-full rounded-full border-white/10 bg-white/5 pl-10 focus:bg-background/80"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 sm:gap-4">
                    <Button
                        className="hidden sm:flex h-8 md:h-9 rounded-full px-3 md:px-4 lg:px-5 font-semibold text-xs md:text-sm shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-purple-600 border-0"
                        onClick={() => window.openPostModal?.()}
                    >
                        <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                        <span className="hidden md:inline">Create</span>
                        <span className="md:hidden">New</span>
                    </Button>

                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" asChild>
                        <Link href="/messages">
                            <MessageSquare className="h-5 w-5" />
                        </Link>
                    </Button>
                    <NotificationBell />

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 ring-offset-background transition-all hover:ring-2 hover:ring-primary/20">
                                <Avatar className="h-10 w-10 border border-white/10">
                                    <AvatarImage src={user?.avatar} />
                                    <AvatarFallback>{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{user?.displayName || user?.username}</p>
                                    <p className="text-xs leading-none text-muted-foreground">@{user?.username}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                <User className="mr-2 h-4 w-4" />
                                <span>Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Settings</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={logout} className="text-red-500 hover:text-red-500 hover:bg-red-500/10">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </nav>
    )
}
