"use client"

import { useEffect, useMemo, useState } from "react"
import { Award, Clock, Loader2, Target, Trophy, Users, Zap } from "lucide-react"
import {
    Challenge,
    ChallengeParticipation,
    formatChallengeStatus,
    formatChallengeType,
    getActiveChallenges,
    getUserChallenges,
    joinChallenge,
    submitChallengeProgress,
} from "@/lib/challenges"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

function difficultyClass(difficulty: string) {
    if (difficulty === "EASY") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
    if (difficulty === "MEDIUM") return "bg-amber-500/10 text-amber-600 border-amber-500/20"
    return "bg-red-500/10 text-red-600 border-red-500/20"
}

function ChallengeIcon({ type }: { type: string }) {
    if (type === "POST_CREATION") return <Target className="h-4 w-4" />
    if (type === "ENGAGEMENT") return <Users className="h-4 w-4" />
    if (type === "COMMUNITY") return <Award className="h-4 w-4" />
    return <Trophy className="h-4 w-4" />
}

function ChallengeCard({
    challenge,
    participation,
    onJoin,
    onSubmit,
    busy,
}: {
    challenge: Challenge;
    participation?: ChallengeParticipation | null;
    onJoin: (challengeId: string) => void;
    onSubmit: (challengeId: string, progress: number, note: string) => void;
    busy: boolean;
}) {
    const [progress, setProgress] = useState(participation?.progress || 0)
    const [note, setNote] = useState("")
    const joined = Boolean(participation)
    const completed = participation?.status === "COMPLETED"

    useEffect(() => {
        setProgress(participation?.progress || 0)
    }, [participation?.progress])

    return (
        <Card>
            <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <ChallengeIcon type={challenge.type} />
                            {challenge.title}
                        </CardTitle>
                        <p className="text-sm leading-6 text-muted-foreground">{challenge.description}</p>
                    </div>
                    <Badge variant="outline" className={difficultyClass(challenge.difficulty)}>{challenge.difficulty}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{formatChallengeType(challenge.type)}</Badge>
                    <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" />{challenge.participantCount} joined</Badge>
                    <Badge variant="outline" className="gap-1"><Trophy className="h-3 w-3" />{challenge.completionCount} completed</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="rounded-md border border-border bg-muted/30 p-4">
                    <div className="text-sm font-medium text-foreground">Requirement</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {challenge.requirements?.description || "Complete the challenge target."}
                    </p>
                    {challenge.requirements?.target ? (
                        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Target: {challenge.requirements.target} {challenge.requirements.metric || "actions"}
                        </p>
                    ) : null}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-4">
                        <span className="flex items-center gap-1"><Zap className="h-4 w-4 text-amber-500" />{challenge.rewards?.xp || 100} XP</span>
                        {challenge.firstCompletionBonus > 0 ? (
                            <span className="flex items-center gap-1"><Award className="h-4 w-4 text-emerald-500" />+{challenge.firstCompletionBonus} first completion</span>
                        ) : null}
                    </div>
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" />Ends {new Date(challenge.endDate).toLocaleDateString()}</span>
                </div>

                {joined ? (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-foreground">{formatChallengeStatus(participation?.status || "ACTIVE")}</span>
                            <span className="text-muted-foreground">{participation?.progress || 0}%</span>
                        </div>
                        <Progress value={participation?.progress || 0} />
                        {completed ? (
                            <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-600">
                                Completed. Earned {participation?.xpEarned || 0} XP{participation?.isFirstCompletion ? " with the first completion bonus" : ""}.
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                <input
                                    type="range"
                                    min={participation?.progress || 0}
                                    max={100}
                                    value={progress}
                                    onChange={(event) => setProgress(Number(event.target.value))}
                                />
                                <Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Optional progress note" />
                                <Button onClick={() => onSubmit(challenge.id, progress, note)} disabled={busy || progress <= (participation?.progress || 0)}>
                                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
                                    Update Progress
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <Button onClick={() => onJoin(challenge.id)} disabled={busy}>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                        Join Challenge
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}

export default function ChallengesPage() {
    const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([])
    const [userChallenges, setUserChallenges] = useState<ChallengeParticipation[]>([])
    const [loading, setLoading] = useState(true)
    const [busyId, setBusyId] = useState("")

    const loadChallenges = async () => {
        setLoading(true)
        try {
            const [active, mine] = await Promise.all([getActiveChallenges(), getUserChallenges()])
            setActiveChallenges(active)
            setUserChallenges(mine)
        } catch (error) {
            console.error("Failed to load challenges:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadChallenges()
    }, [])

    const participationsByChallengeId = useMemo(() => {
        return new Map(userChallenges.map((participation) => [participation.challengeId, participation]))
    }, [userChallenges])

    const handleJoin = async (challengeId: string) => {
        setBusyId(challengeId)
        try {
            await joinChallenge(challengeId)
            await loadChallenges()
        } catch (error) {
            console.error("Failed to join challenge:", error)
        } finally {
            setBusyId("")
        }
    }

    const handleSubmit = async (challengeId: string, progress: number, note: string) => {
        setBusyId(challengeId)
        try {
            await submitChallengeProgress(challengeId, progress, note)
            await loadChallenges()
        } catch (error) {
            console.error("Failed to update challenge progress:", error)
        } finally {
            setBusyId("")
        }
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Weekly Challenges</h1>
                <p className="mt-1 text-sm text-muted-foreground">Join focused weekly goals, track progress, and earn XP on completion.</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <Tabs defaultValue="active" className="space-y-5">
                    <TabsList>
                        <TabsTrigger value="active">Active</TabsTrigger>
                        <TabsTrigger value="mine">My Challenges</TabsTrigger>
                    </TabsList>
                    <TabsContent value="active" className="space-y-4">
                        {activeChallenges.length === 0 ? (
                            <Card><CardContent className="py-16 text-center"><Trophy className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" /><p className="font-medium">No active challenges</p></CardContent></Card>
                        ) : activeChallenges.map((challenge) => (
                            <ChallengeCard
                                key={challenge.id}
                                challenge={challenge}
                                participation={participationsByChallengeId.get(challenge.id) || challenge.participation}
                                onJoin={handleJoin}
                                onSubmit={handleSubmit}
                                busy={busyId === challenge.id}
                            />
                        ))}
                    </TabsContent>
                    <TabsContent value="mine" className="space-y-4">
                        {userChallenges.length === 0 ? (
                            <Card><CardContent className="py-16 text-center"><Target className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" /><p className="font-medium">No challenges joined yet</p></CardContent></Card>
                        ) : userChallenges.map((participation) => participation.challenge ? (
                            <ChallengeCard
                                key={participation.id}
                                challenge={participation.challenge}
                                participation={participation}
                                onJoin={handleJoin}
                                onSubmit={handleSubmit}
                                busy={busyId === participation.challengeId}
                            />
                        ) : null)}
                    </TabsContent>
                </Tabs>
            )}
        </div>
    )
}
