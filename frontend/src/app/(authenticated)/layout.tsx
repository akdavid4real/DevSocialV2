"use client"

import { useEffect, useState, ReactNode } from "react"
import { usePathname, useRouter } from "@/lib/navigation"
import { useAuth } from "@/contexts/auth-context"
import Navbar from "@/components/layout/Navbar"
import SideNav from "@/components/layout/SideNav"
import RightRail from "@/components/layout/RightRail"
import { SimplePostModal } from "@/components/modals/SimplePostModal"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth()
    const pathname = usePathname()
    const router = useRouter()
    const [isModalOpen, setIsModalOpen] = useState(false)

    const hideRightSidebar = pathname?.startsWith('/@') || pathname?.startsWith('/%40') || pathname === '/me' || pathname === '/messages' || pathname?.startsWith('/settings')

    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth/login')
        }
    }, [loading, user, router])

    useEffect(() => {
        window.openPostModal = () => setIsModalOpen(true)
        return () => {
            delete window.openPostModal
        }
    }, [])

    if (loading || !user) return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="animate-pulse text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/60">
                Syncing Terminal...
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
            <Navbar />

            <div className="mx-auto max-w-[1400px] px-2 sm:px-4 md:px-6 lg:px-8 py-2 md:py-4 h-[calc(100vh-64px)]">
                <div className="flex w-full gap-4 md:gap-6 h-full">
                    <aside className="hidden md:block w-[240px] lg:w-[260px] xl:w-[280px] shrink-0 h-full overflow-y-auto pr-1 scrollbar-none">
                        <SideNav />
                    </aside>

                    <main className="flex-1 min-w-0 h-full overflow-y-auto scrollbar-hide space-y-6 pb-10 px-1">
                        {children}
                    </main>

                    {!hideRightSidebar && (
                        <aside className="hidden lg:block w-[300px] xl:w-[320px] shrink-0 h-full overflow-y-auto pl-1 scrollbar-none">
                            <RightRail />
                        </aside>
                    )}
                </div>
            </div>

            <Button
                onClick={() => setIsModalOpen(true)}
                className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl shadow-primary/40 p-0 flex items-center justify-center bg-gradient-to-br from-primary to-purple-600 border-0 z-50"
            >
                <Plus className="h-6 w-6 text-foreground" />
            </Button>

            <SimplePostModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmitSuccess={(post) => {
                    window.dispatchEvent(new CustomEvent('post-created', { detail: post }))
                    setIsModalOpen(false)
                }}
            />
        </div>
    )
}
