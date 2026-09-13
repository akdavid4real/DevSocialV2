"use client"

import { TrendingUp, Hash, Trophy, UserPlus } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

export default function RightRail() {
    return (
        <div className="flex flex-col gap-6">
            {/* Trending Topics */}
            <Card className="bg-card border-border rounded-3xl">
                <CardHeader className="pb-3 border-b border-border">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                        <span className="text-sm font-bold text-foreground uppercase tracking-wider">Trending Tags</span>
                    </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    {['NextJS', 'NestJS', 'Prisma', 'Tailwind', 'AI', 'Web3'].map((tag) => (
                        <div key={tag} className="flex items-center justify-between group cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors border border-emerald-400/20">
                                    <Hash className="h-4 w-4 text-emerald-400" />
                                </div>
                                <span className="text-sm font-semibold text-foreground/80 group-hover:text-emerald-400 transition-colors">#{tag}</span>
                            </div>
                            <span className="text-xs font-bold text-muted-foreground/60 uppercase">Trending</span>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Top Developers (Leaderboard Preview) */}
            <Card className="bg-card border-border rounded-3xl">
                <CardHeader className="pb-3 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm font-bold text-foreground uppercase tracking-wider">Top Devs</span>
                    </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-5">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="relative">
                                <Avatar className="h-9 w-9 ring-2 ring-border">
                                    <AvatarFallback>U{i}</AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-yellow-400 text-xs font-bold flex items-center justify-center text-black border-2 border-background">
                                    {i}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-foreground truncate">Developer {i}</div>
                                <div className="text-xs font-medium text-muted-foreground">Level {20 - i * 2} • {2500 - i * 200} XP</div>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl hover:bg-primary/20 hover:text-primary">
                                <UserPlus className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    <Button variant="ghost" className="w-full h-8 text-xs font-bold text-primary hover:bg-primary/10 rounded-xl">
                        View Full Leaderboard
                    </Button>
                </CardContent>
            </Card>

            {/* Community Callouts */}
            <div className="px-4 py-6 rounded-3xl bg-gradient-to-br from-primary/20 to-purple-600/20 border border-primary/20 relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-pointer">
                <div className="relative z-10">
                    <h3 className="text-sm font-bold text-foreground mb-1">New Weekly Challenge!</h3>
                    <p className="text-xs text-foreground/70 leading-relaxed mb-4">Build a real-time chat with Socket.io and NestJS. Win early access to DevSocial Pro.</p>
                    <Button size="sm" className="w-full h-8 rounded-xl text-xs font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90">Join Now</Button>
                </div>
                <div className="absolute -top-10 -right-10 h-32 w-32 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-colors" />
            </div>
        </div>
    )
}
