"use client"

import { useState, useEffect } from 'react'
import { Users, Loader2 } from 'lucide-react'
import Image from '@/components/ui/image'
import Link from '@/components/ui/link'
import api from '@/lib/api'

interface MutualConnectionsProps {
    userId: string
    currentUserId?: string
}

interface MutualUser {
    id: string
    username: string
    displayName: string
    avatar: string
    level: number
}

export default function MutualConnections({ userId, currentUserId }: MutualConnectionsProps) {
    const [mutualFollowers, setMutualFollowers] = useState<MutualUser[]>([])
    const [loading, setLoading] = useState(true)
    const [showAll, setShowAll] = useState(false)

    useEffect(() => {
        if (!currentUserId || userId === currentUserId) {
            setLoading(false)
            return
        }

        fetchMutualConnections()
    }, [userId, currentUserId])

    const fetchMutualConnections = async () => {
        try {
            setLoading(true)
            const response: any = await api.get(`/follow/${userId}/mutual-followers`)
            const data = Array.isArray(response) ? response : (response.data || [])
            setMutualFollowers(data)
        } catch (err) {
            console.error('Error fetching mutual connections:', err)
            setMutualFollowers([])
        } finally {
            setLoading(false)
        }
    }

    if (!currentUserId || userId === currentUserId || loading) {
        return null
    }

    if (mutualFollowers.length === 0) {
        return null
    }

    const displayedFollowers = showAll ? mutualFollowers : mutualFollowers.slice(0, 3)
    const remainingCount = mutualFollowers.length - 3

    return (
        <section className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3 p-4 sm:p-5 md:p-6 rounded-[24px] sm:rounded-[32px] bg-card border-border">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold tracking-widest text-foreground">
                        {mutualFollowers.length} Mutual Connection{mutualFollowers.length !== 1 ? 's' : ''}
                    </h3>
                    <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground/60">
                        Followers you both know
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {displayedFollowers.map((user) => (
                    <Link
                        key={user.id}
                        href={`/@${user.username}`}
                        className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-[20px] sm:rounded-[24px] bg-card border-border hover:bg-card/80 hover:border-border transition-all group"
                    >
                        <div className="relative">
                            <Image
                                src={user.avatar || '/default-avatar.png'}
                                alt={user.displayName || user.username}
                                width={40}
                                height={40}
                                className="rounded-full border-2 border-white/10 group-hover:border-primary/50 transition-colors"
                            />
                            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[#0A0A0B] border border-white/10 flex items-center justify-center">
                                <span className="text-[8px] font-semibold text-primary">{user.level}</span>
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                {user.displayName || user.username}
                            </p>
                            <p className="text-xs font-semibold text-muted-foreground/60 tracking-wider">
                                @{user.username}
                            </p>
                        </div>
                    </Link>
                ))}

                {!showAll && remainingCount > 0 && (
                    <button
                        onClick={() => setShowAll(true)}
                        className="w-full p-3 rounded-[20px] bg-card border-border hover:bg-card/80 hover:border-border transition-all text-xs font-semibold uppercase tracking-widest text-primary"
                    >
                        + {remainingCount} More
                    </button>
                )}

                {showAll && mutualFollowers.length > 3 && (
                    <button
                        onClick={() => setShowAll(false)}
                        className="w-full p-3 rounded-[20px] bg-card border-border hover:bg-card/80 hover:border-border transition-all text-xs font-semibold uppercase tracking-widest text-muted-foreground/60"
                    >
                        Show Less
                    </button>
                )}
            </div>
        </section>
    )
}
