"use client"

import { useEffect, useMemo, useState } from "react"
import { Award, CheckCircle2, Loader2, Play, Sparkles, Target, Trophy, Users } from "lucide-react"
import {
    formatMissionLabel,
    getMissions,
    joinMission,
    Mission,
    MISSION_DIFFICULTIES,
    MISSION_DURATIONS,
    MissionProgress,
    MISSION_TYPES,
    updateMissionProgress,
} from "@/lib/missions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function difficultyClass(difficulty: string) {
    if (difficulty === "BEGINNER") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
    if (difficulty === "INTERMEDIATE") return "bg-amber-500/10 text-amber-600 border-amber-500/20"
    if (difficulty === "ADVANCED") return "bg-orange-500/10 text-orange-600 border-orange-500/20"
    return "bg-red-500/10 text-red-600 border-red-500/20"
}

function missionCompletion(mission: Mission) {
    const completed = mission.userProgress?.stepsCompleted?.length || 0
    const total = mission.steps.length || 1
    return Math.round((completed / total) * 100)
}

function MissionCard({
    mission,
    busy,
    onJoin,
    onStepComplete,
}: {
    mission: Mission;
    busy: boolean;
    onJoin: (missionId: string) => void;
    onStepComplete: (missionId: string, stepId: string, target: number) => void;
}) {
    const joined = Boolean(mission.userProgress)
    const completed = mission.userProgress?.status === "COMPLETED"
    const progressByStep = new Map((mission.userProgress?.progress || []).map((item) => [item.stepId, item]))
    const percent = missionCompletion(mission)

    return (
        <Card>
            <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Target className="h-5 w-5" />
                            {mission.title}
                        </CardTitle>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{mission.description}</p>
                    </div>
                    <Badge variant="outline" className={difficultyClass(mission.difficulty)}>{formatMissionLabel(mission.difficulty)}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{formatMissionLabel(mission.type)}</Badge>
                    <Badge variant="outline">{formatMissionLabel(mission.duration)}</Badge>
                    <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" />{mission.participantCount}</Badge>
                    <Badge variant="outline" className="gap-1"><Trophy className="h-3 w-3" />{mission.completionCount}</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{joined ? formatMissionLabel(mission.userProgress?.status || "ACTIVE") : "Not joined"}</span>
                        <span className="text-muted-foreground">{percent}%</span>
                    </div>
                    <Progress value={percent} />
                </div>

                <div className="space-y-3">
                    {mission.steps.map((step) => {
                        const stepProgress = progressByStep.get(step.id)
                        const isCompleted = Boolean(stepProgress?.completed || mission.userProgress?.stepsCompleted?.includes(step.id))
                        return (
                            <div key={step.id} className="flex items-start gap-3 rounded-md border border-border p-3">
                                <Checkbox
                                    checked={isCompleted}
                                    disabled={!joined || completed || busy || isCompleted}
                                    onCheckedChange={() => onStepComplete(mission.id, step.id, stepProgress?.target || step.target || 1)}
                                    className="mt-1"
                                />
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-foreground">{step.title || step.description || step.id}</div>
                                    {step.description && step.title ? <p className="mt-1 text-sm text-muted-foreground">{step.description}</p> : null}
                                    {step.metric || step.target ? (
                                        <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                                            {step.target || 1} {step.metric || "actions"}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="secondary" className="gap-1"><Sparkles className="h-3 w-3" />{mission.rewards?.xp || 100} XP</Badge>
                    {mission.rewards?.badge ? <Badge variant="outline" className="gap-1"><Award className="h-3 w-3" />{mission.rewards.badge}</Badge> : null}
                    {mission.rewards?.title ? <Badge variant="outline">{mission.rewards.title}</Badge> : null}
                </div>

                {!joined ? (
                    <Button onClick={() => onJoin(mission.id)} disabled={busy}>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        Join Mission
                    </Button>
                ) : completed ? (
                    <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-600">
                        Completed. Earned {mission.userProgress?.xpEarned || 0} XP.
                    </div>
                ) : null}
            </CardContent>
        </Card>
    )
}

export default function MissionsPage() {
    const [missions, setMissions] = useState<Mission[]>([])
    const [type, setType] = useState("")
    const [difficulty, setDifficulty] = useState("")
    const [duration, setDuration] = useState("")
    const [loading, setLoading] = useState(true)
    const [busyId, setBusyId] = useState("")

    const loadMissions = async () => {
        setLoading(true)
        try {
            setMissions(await getMissions({ type, difficulty, duration }))
        } catch (error) {
            console.error("Failed to load missions:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadMissions()
    }, [type, difficulty, duration])

    const handleJoin = async (missionId: string) => {
        setBusyId(missionId)
        try {
            await joinMission(missionId)
            await loadMissions()
        } catch (error) {
            console.error("Failed to join mission:", error)
        } finally {
            setBusyId("")
        }
    }

    const handleStepComplete = async (missionId: string, stepId: string, target: number) => {
        setBusyId(missionId)
        try {
            await updateMissionProgress(missionId, stepId, target, true)
            await loadMissions()
        } catch (error) {
            console.error("Failed to update mission progress:", error)
        } finally {
            setBusyId("")
        }
    }

    const availableMissions = useMemo(() => missions.filter((mission) => !mission.userProgress), [missions])
    const activeMissions = useMemo(() => missions.filter((mission) => mission.userProgress?.status === "ACTIVE"), [missions])
    const completedMissions = useMemo(() => missions.filter((mission) => mission.userProgress?.status === "COMPLETED"), [missions])

    const renderMissions = (items: Mission[]) => {
        if (items.length === 0) {
            return (
                <Card>
                    <CardContent className="py-16 text-center">
                        <Target className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
                        <p className="font-medium text-foreground">No missions found</p>
                    </CardContent>
                </Card>
            )
        }

        return (
            <div className="grid gap-4 xl:grid-cols-2">
                {items.map((mission) => (
                    <MissionCard
                        key={mission.id}
                        mission={mission}
                        busy={busyId === mission.id}
                        onJoin={handleJoin}
                        onStepComplete={handleStepComplete}
                    />
                ))}
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Missions</h1>
                <p className="mt-1 text-sm text-muted-foreground">Complete multi-step developer goals to earn XP and badges.</p>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
                <select value={type} onChange={(event) => setType(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    <option value="">All types</option>
                    {MISSION_TYPES.map((item) => <option key={item} value={item}>{formatMissionLabel(item)}</option>)}
                </select>
                <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    <option value="">All difficulties</option>
                    {MISSION_DIFFICULTIES.map((item) => <option key={item} value={item}>{formatMissionLabel(item)}</option>)}
                </select>
                <select value={duration} onChange={(event) => setDuration(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    <option value="">All durations</option>
                    {MISSION_DURATIONS.map((item) => <option key={item} value={item}>{formatMissionLabel(item)}</option>)}
                </select>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <Tabs defaultValue="available" className="space-y-5">
                    <TabsList>
                        <TabsTrigger value="available">Available ({availableMissions.length})</TabsTrigger>
                        <TabsTrigger value="active">Active ({activeMissions.length})</TabsTrigger>
                        <TabsTrigger value="completed">Completed ({completedMissions.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="available">{renderMissions(availableMissions)}</TabsContent>
                    <TabsContent value="active">{renderMissions(activeMissions)}</TabsContent>
                    <TabsContent value="completed">{renderMissions(completedMissions)}</TabsContent>
                </Tabs>
            )}
        </div>
    )
}
