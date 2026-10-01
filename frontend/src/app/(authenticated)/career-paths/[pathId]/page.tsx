"use client"

import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock, Target } from "lucide-react"
import { formatDifficulty, useCareerPath } from "@/lib/career-paths"
import { useParams, useRouter } from "@/lib/navigation"
import Link from "@/components/ui/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CareerPathDetailPage() {
    const router = useRouter()
    const params = useParams()
    const pathId = typeof params.pathId === "string" ? params.pathId : ""
    const { data: path, isPending, isError, error, refetch } = useCareerPath(pathId)

    if (isPending) return <p role="status">Loading career path...</p>
    if (isError && (error as { statusCode?: number })?.statusCode !== 404) return <div role="alert">Unable to load career path. <Button onClick={() => refetch()}>Retry</Button></div>

    if (!path) {
        return (
            <div className="mx-auto max-w-3xl space-y-4">
                <Button variant="ghost" asChild>
                    <Link href="/career-paths"><ArrowLeft className="h-4 w-4" /> Career Paths</Link>
                </Button>
                <Card>
                    <CardContent className="py-16 text-center">
                        <h1 className="text-2xl font-bold text-foreground">Career path not found</h1>
                        <p className="mt-2 text-sm text-muted-foreground">Choose one of the available learning routes.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <Button variant="ghost" asChild>
                <Link href="/career-paths"><ArrowLeft className="h-4 w-4" /> Career Paths</Link>
            </Button>

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <div className="space-y-6">
                    <div>
                        <div className="mb-3 flex flex-wrap gap-2">
                            <Badge variant="outline">{formatDifficulty(path.difficulty)}</Badge>
                            <Badge variant="secondary">{path.duration}</Badge>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">{path.title}</h1>
                        <p className="mt-2 text-base leading-7 text-muted-foreground">{path.description}</p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Target className="h-5 w-5 text-primary" />
                                Role Focus
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">{path.roleFocus}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {path.skills.map((skill) => (
                                    <Badge key={skill} variant="secondary">{skill}</Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-3">
                        <h2 className="text-xl font-bold text-foreground">Modules</h2>
                        {path.modules.map((module, index) => (
                            <Card
                                key={module.id}
                                className="cursor-pointer transition-colors hover:bg-muted/40"
                                onClick={() => router.push(`/career-paths/${path.id}/${module.id}`)}
                            >
                                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                                        {index + 1}
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                            <h3 className="font-semibold text-foreground">{module.title}</h3>
                                            <div className="flex shrink-0 gap-2">
                                                <Badge variant="outline">{formatDifficulty(module.difficulty)}</Badge>
                                                <Badge variant="secondary">{module.duration}</Badge>
                                            </div>
                                        </div>
                                        <p className="text-sm leading-6 text-muted-foreground">{module.description}</p>
                                        <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                            <BookOpen className="h-4 w-4" />
                                            Open module
                                            <ArrowRight className="h-4 w-4" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                <aside className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Path overview</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-sm">
                                <div>
                                    <div className="text-2xl font-bold text-foreground">{path.modules.length}</div>
                                    <div className="text-muted-foreground">Total modules</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Readiness Check</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-muted-foreground">
                            <div className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> You can commit a few focused hours each week.</div>
                            <div className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> You are ready to build small artifacts while learning.</div>
                            <div className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Start with the first module.</div>
                        </CardContent>
                    </Card>
                </aside>
            </div>
        </div>
    )
}
