"use client"

import { ArrowRight, BookOpen, Clock, Route, Sparkles } from "lucide-react"
import { getCareerPaths, formatDifficulty } from "@/lib/career-paths"
import { useRouter } from "@/lib/navigation"
import Link from "@/components/ui/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export default function CareerPathsPage() {
    const router = useRouter()
    const paths = getCareerPaths()
    const moduleCount = paths.reduce((sum, path) => sum + path.modules.length, 0)

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Career Paths</h1>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                        Structured learning routes for developers who want a clearer path from skills to product work.
                    </p>
                </div>
                <Button asChild className="w-full sm:w-auto">
                    <Link href="/career-paths/frontend-developer">
                        <Sparkles className="h-4 w-4" />
                        Start Frontend
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <Card><CardContent className="p-4"><div className="text-2xl font-bold">{paths.length}</div><div className="text-sm text-muted-foreground">Paths</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-2xl font-bold">{moduleCount}</div><div className="text-sm text-muted-foreground">Modules</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-2xl font-bold">0%</div><div className="text-sm text-muted-foreground">Saved progress</div></CardContent></Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {paths.map((path) => (
                    <Card
                        key={path.id}
                        className="cursor-pointer transition-colors hover:bg-muted/40"
                        onClick={() => router.push(`/career-paths/${path.id}`)}
                    >
                        <CardHeader className="space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-2">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <Route className="h-5 w-5" />
                                    </div>
                                    <CardTitle className="text-xl">{path.title}</CardTitle>
                                </div>
                                <Badge variant="outline" className="shrink-0">{formatDifficulty(path.difficulty)}</Badge>
                            </div>
                            <p className="text-sm leading-6 text-muted-foreground">{path.subtitle}</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{path.description}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {path.skills.slice(0, 6).map((skill) => (
                                    <Badge key={skill} variant="secondary" className="text-[10px]">{skill}</Badge>
                                ))}
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{path.modules.length} modules</span>
                                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{path.duration}</span>
                                </div>
                                <Progress value={0} />
                            </div>
                            <div className="flex items-center justify-between text-sm font-medium text-primary">
                                <span>View path</span>
                                <ArrowRight className="h-4 w-4" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
