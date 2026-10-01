"use client"

import { useQuery } from "@tanstack/react-query"
import { TrendingUp, Hash, Trophy } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import Link from "@/components/ui/link"
import api from "@/lib/api"
import { getActiveChallenges } from "@/lib/challenges"
import { useAuth } from "@/contexts/auth-context"

interface Topic { tag: string; posts: number }
interface RankedUser {
    id: string; username: string; displayName?: string; avatar?: string; level: number; points: number
}

export default function RightRail() {
    const { user } = useAuth()
    const topics = useQuery({
        queryKey: ["right-rail", "trending", user?.id],
        queryFn: async () => {
            const response = await api.get<unknown, { data: { trendingTopics: Topic[] } }>("/trending", { params: { period: "week" } })
            return response.data.trendingTopics
        },
    })
    const leaders = useQuery({
        queryKey: ["right-rail", "leaderboard"],
        queryFn: async () => {
            const response = await api.get<unknown, { data: { users: RankedUser[] } }>("/users/leaderboard", { params: { period: "all", limit: 3 } })
            return response.data.users
        },
    })
    const challenges = useQuery({ queryKey: ["active-challenges", user?.id], queryFn: getActiveChallenges })
    const challenge = challenges.data?.[0]

    return (
        <div className="flex flex-col gap-6">
            <Card className="bg-card border-border rounded-3xl">
                <CardHeader className="pb-3 border-b border-border">
                    <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-400" /><span className="text-sm font-bold text-foreground uppercase tracking-wider">Trending Tags</span></div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    {topics.isPending ? <p role="status" className="text-sm text-muted-foreground">Loading tags...</p>
                        : topics.isError ? <div role="alert" className="text-sm text-muted-foreground">Unable to load tags. <Button variant="ghost" size="sm" onClick={() => topics.refetch()}>Retry tags</Button></div>
                        : topics.data?.length ? topics.data.slice(0, 6).map((topic) => (
                            <Link key={topic.tag} href={`/tag/${encodeURIComponent(topic.tag)}`} className="flex items-center justify-between gap-3 group">
                                <div className="flex items-center gap-3 min-w-0"><div className="h-8 w-8 shrink-0 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-400/20"><Hash className="h-4 w-4 text-emerald-400" /></div><span className="truncate text-sm font-semibold text-foreground/80 group-hover:text-emerald-400">#{topic.tag}</span></div>
                                <span className="shrink-0 text-xs text-muted-foreground">{topic.posts} {topic.posts === 1 ? "post" : "posts"}</span>
                            </Link>
                        )) : <p className="text-sm text-muted-foreground">No trending tags this week.</p>}
                </CardContent>
            </Card>
            <Card className="bg-card border-border rounded-3xl">
                <CardHeader className="pb-3 border-b border-border"><div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-yellow-400" /><span className="text-sm font-bold text-foreground uppercase tracking-wider">Top Devs</span></div></CardHeader>
                <CardContent className="pt-4 space-y-5">
                    {leaders.isPending ? <p role="status" className="text-sm text-muted-foreground">Loading rankings...</p>
                        : leaders.isError ? <div role="alert" className="text-sm text-muted-foreground">Unable to load rankings. <Button variant="ghost" size="sm" onClick={() => leaders.refetch()}>Retry rankings</Button></div>
                        : leaders.data?.length ? leaders.data.map((leader, index) => (
                            <Link key={leader.id} href={`/@${encodeURIComponent(leader.username)}`} className="flex items-center gap-3 hover:text-primary">
                                <div className="relative"><Avatar className="h-9 w-9 ring-2 ring-border"><AvatarImage src={leader.avatar} /><AvatarFallback>{(leader.displayName || leader.username).slice(0, 1).toUpperCase()}</AvatarFallback></Avatar><div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-yellow-400 text-xs font-bold flex items-center justify-center text-black border-2 border-background">{index + 1}</div></div>
                                <div className="flex-1 min-w-0"><div className="text-xs font-bold truncate">{leader.displayName || leader.username}</div><div className="text-xs font-medium text-muted-foreground">Level {leader.level} • {leader.points} XP</div></div>
                            </Link>
                        )) : <p className="text-sm text-muted-foreground">No rankings yet.</p>}
                    <Button variant="ghost" asChild className="w-full h-8 text-xs font-bold text-primary rounded-xl"><Link href="/leaderboard">View Full Leaderboard</Link></Button>
                </CardContent>
            </Card>
            {challenges.isPending ? <p role="status" className="px-4 text-sm text-muted-foreground">Loading challenges...</p>
                : challenges.isError ? <div role="alert" className="px-4 text-sm text-muted-foreground">Unable to load challenges. <Button variant="ghost" size="sm" onClick={() => challenges.refetch()}>Retry challenges</Button></div>
                : challenge ? <div className="px-4 py-6 rounded-3xl bg-gradient-to-br from-primary/20 to-purple-600/20 border border-primary/20"><h3 className="text-sm font-bold text-foreground mb-1">{challenge.title}</h3><p className="text-xs text-foreground/70 leading-relaxed mb-4">{challenge.description}</p><Button size="sm" asChild className="w-full h-8 rounded-xl text-xs font-bold"><Link href="/challenges">View Challenge</Link></Button></div> : null}
        </div>
    )
}
