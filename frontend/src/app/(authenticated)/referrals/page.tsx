"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Copy, Gift, Loader2, Share2, Sparkles, Users } from "lucide-react"
import { formatReferralStatus, getReferralCode, getReferralStats, ReferralStats } from "@/lib/referrals"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

function statusClass(status: string) {
    if (status === "COMPLETED") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
    if (status === "EXPIRED") return "bg-muted text-muted-foreground border-border"
    return "bg-amber-500/10 text-amber-600 border-amber-500/20"
}

export default function ReferralsPage() {
    const [referralCode, setReferralCode] = useState("")
    const [stats, setStats] = useState<ReferralStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        const loadReferrals = async () => {
            setLoading(true)
            try {
                const [code, referralStats] = await Promise.all([getReferralCode(), getReferralStats()])
                setReferralCode(code.referralCode)
                setStats(referralStats)
            } catch (error) {
                console.error("Failed to load referrals:", error)
            } finally {
                setLoading(false)
            }
        }

        loadReferrals()
    }, [])

    const referralLink = useMemo(() => {
        if (!referralCode || typeof window === "undefined") return ""
        return `${window.location.origin}/auth/signup?ref=${encodeURIComponent(referralCode)}`
    }, [referralCode])

    const copyReferralLink = async () => {
        if (!referralLink) return
        await navigator.clipboard.writeText(referralLink)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1600)
    }

    const shareReferralLink = async () => {
        if (!referralLink) return
        if (navigator.share) {
            await navigator.share({
                title: "Join DevSocial",
                text: "Join me on DevSocial.",
                url: referralLink,
            })
            return
        }
        await copyReferralLink()
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Referrals</h1>
                <p className="mt-1 text-sm text-muted-foreground">Invite developers to DevSocial and earn XP when they join.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-muted-foreground"><Users className="h-4 w-4" />Total</div><div className="mt-2 text-2xl font-bold">{stats?.stats.total.count || 0}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-muted-foreground"><Check className="h-4 w-4" />Completed</div><div className="mt-2 text-2xl font-bold">{stats?.stats.completed.count || 0}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-muted-foreground"><Sparkles className="h-4 w-4" />Rewards</div><div className="mt-2 text-2xl font-bold">{stats?.stats.total.rewards || 0} XP</div></CardContent></Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5" />Share your referral link</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                        <Input value={referralLink} readOnly />
                        <Button variant="outline" onClick={copyReferralLink}>
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            {copied ? "Copied" : "Copy"}
                        </Button>
                        <Button onClick={shareReferralLink}>
                            <Share2 className="h-4 w-4" />
                            Share
                        </Button>
                    </div>
                    <div className="rounded-md border border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
                        You earn 25 XP when someone creates an account with your link. They receive 15 XP as a welcome bonus.
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Recent referrals</CardTitle>
                </CardHeader>
                <CardContent>
                    {!stats?.recentReferrals.length ? (
                        <div className="py-12 text-center">
                            <Gift className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
                            <p className="font-medium text-foreground">No referrals yet</p>
                            <p className="mt-1 text-sm text-muted-foreground">Share your link to start earning rewards.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {stats.recentReferrals.map((referral) => (
                                <div key={referral.id} className="flex items-center justify-between gap-4 rounded-md border border-border p-4">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={referral.referred?.avatar || undefined} />
                                            <AvatarFallback>{referral.referred?.displayName?.[0] || referral.referred?.username?.[0] || "?"}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <div className="truncate font-medium text-foreground">{referral.referred?.displayName || referral.referred?.username || "Unknown user"}</div>
                                            <div className="text-xs text-muted-foreground">{new Date(referral.createdAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <Badge variant="outline" className={statusClass(referral.status)}>{formatReferralStatus(referral.status)}</Badge>
                                        {referral.status === "COMPLETED" ? <span className="text-sm font-semibold text-emerald-600">+{referral.referrerReward} XP</span> : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
