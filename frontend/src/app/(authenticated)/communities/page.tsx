"use client"

import { useEffect, useMemo, useState } from "react"
import { Compass, Loader2, Plus, Search, TrendingUp, Users, Users2 } from "lucide-react"
import { COMMUNITY_CATEGORIES, Community, getCommunities, toggleCommunityMembership } from "@/lib/communities"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "@/lib/navigation"
import Link from "@/components/ui/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function CommunitiesPage() {
    const { user } = useAuth()
    const router = useRouter()
    const [communities, setCommunities] = useState<Community[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [category, setCategory] = useState<string>("")
    const [loading, setLoading] = useState(true)
    const [joiningId, setJoiningId] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false

        const loadCommunities = async () => {
            setLoading(true)
            try {
                const data = await getCommunities({ search: searchQuery, category, limit: 24 })
                if (!cancelled) setCommunities(data.communities)
            } catch (error) {
                console.error("Failed to load communities:", error)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        const timeout = window.setTimeout(loadCommunities, 200)
        return () => {
            cancelled = true
            window.clearTimeout(timeout)
        }
    }, [searchQuery, category])

    const categoryOptions = useMemo(() => ["", ...COMMUNITY_CATEGORIES], [])

    const handleJoin = async (community: Community, event: React.MouseEvent) => {
        event.stopPropagation()
        if (!user) {
            router.push("/auth/login")
            return
        }

        setJoiningId(community.id)
        try {
            const data = await toggleCommunityMembership(community.slug)
            setCommunities((previous) =>
                previous.map((item) => item.id === community.id ? data.community : item)
            )
        } catch (error) {
            console.error("Failed to update community membership:", error)
        } finally {
            setJoiningId(null)
        }
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Communities</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Find focused spaces for the developers, stacks, and topics you care about.
                    </p>
                </div>
                <Button asChild className="w-full sm:w-auto">
                    <Link href="/communities/create">
                        <Plus className="h-4 w-4" />
                        Create Community
                    </Link>
                </Button>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search communities..."
                        className="pl-10"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {categoryOptions.map((option) => (
                        <button
                            key={option || "ALL"}
                            type="button"
                            onClick={() => setCategory(option)}
                            className={`h-10 shrink-0 rounded-full border px-4 text-xs font-semibold transition-colors ${
                                category === option
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                        >
                            {option || "ALL"}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : communities.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <Compass className="mb-4 h-12 w-12 text-muted-foreground/30" />
                        <h2 className="text-lg font-semibold text-foreground">No communities found</h2>
                        <p className="mt-2 text-sm text-muted-foreground">Create the first space for this topic.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {communities.map((community) => {
                        const isMember = !!user && community.memberIds.includes(user.id)
                        const isJoining = joiningId === community.id

                        return (
                            <Card
                                key={community.id}
                                className="cursor-pointer transition-colors hover:bg-muted/40"
                                onClick={() => router.push(`/communities/${community.slug}`)}
                            >
                                <CardContent className="space-y-4 p-5">
                                    <div className="flex items-start gap-3">
                                        <Avatar className="h-12 w-12">
                                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                {community.name[0]?.toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <h2 className="truncate text-base font-bold text-foreground">{community.name}</h2>
                                            <Badge variant="secondary" className="mt-1 text-[10px]">
                                                {community.category}
                                            </Badge>
                                        </div>
                                    </div>

                                    <p className="line-clamp-3 min-h-[60px] text-sm leading-5 text-muted-foreground">
                                        {community.description}
                                    </p>

                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5" />
                                            {community.memberCount.toLocaleString()} members
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <TrendingUp className="h-3.5 w-3.5" />
                                            {community.postCount.toLocaleString()} posts
                                        </span>
                                    </div>

                                    <Button
                                        type="button"
                                        variant={isMember ? "outline" : "default"}
                                        size="sm"
                                        className="w-full"
                                        disabled={isJoining}
                                        onClick={(event) => handleJoin(community, event)}
                                    >
                                        {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users2 className="h-4 w-4" />}
                                        {isMember ? "Joined" : "Join"}
                                    </Button>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
