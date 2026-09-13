"use client"

import { useEffect, useMemo, useState } from "react"
import { Eye, FolderGit2, Loader2, Plus, Users } from "lucide-react"
import { formatProjectStatus, getMyProjects, Project, PROJECT_STATUSES } from "@/lib/projects"
import { useRouter } from "@/lib/navigation"
import Link from "@/components/ui/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

type MyProjectsStats = {
    totalViews: number
    byStatus: Record<string, number>
}

const defaultStats: MyProjectsStats = { totalViews: 0, byStatus: {} }

function projectPositionsCount(project: Project) {
    return Array.isArray(project.openPositions) ? project.openPositions.length : 0
}

export default function MyProjectsPage() {
    const router = useRouter()
    const [projects, setProjects] = useState<Project[]>([])
    const [stats, setStats] = useState<MyProjectsStats>(defaultStats)
    const [status, setStatus] = useState("")
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        const loadProjects = async () => {
            setLoading(true)
            try {
                const data = await getMyProjects({ status, limit: 50 })
                if (!cancelled) {
                    setProjects(data.projects)
                    setStats(data.stats || defaultStats)
                }
            } catch (error) {
                console.error("Failed to load owned projects:", error)
                if (!cancelled) {
                    setProjects([])
                    setStats(defaultStats)
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        loadProjects()
        return () => {
            cancelled = true
        }
    }, [status])

    const openPositions = useMemo(() => projects.reduce((sum, project) => sum + projectPositionsCount(project), 0), [projects])
    const activeCount = (stats.byStatus.PLANNING || 0) + (stats.byStatus.IN_PROGRESS || 0)

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">My Projects</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage the projects you created, track visibility, and keep open roles current.
                    </p>
                </div>
                <Button asChild className="w-full sm:w-auto">
                    <Link href="/projects/create">
                        <Plus className="h-4 w-4" />
                        New Project
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
                <Card><CardContent className="p-4"><div className="text-2xl font-bold">{projects.length}</div><div className="text-sm text-muted-foreground">Showing</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-2xl font-bold">{activeCount}</div><div className="text-sm text-muted-foreground">Active</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-2xl font-bold">{stats.totalViews}</div><div className="text-sm text-muted-foreground">Total views</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-2xl font-bold">{openPositions}</div><div className="text-sm text-muted-foreground">Open roles</div></CardContent></Card>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                    <Button variant={status === "" ? "default" : "outline"} size="sm" onClick={() => setStatus("")}>All</Button>
                    {PROJECT_STATUSES.map((item) => (
                        <Button key={item} variant={status === item ? "default" : "outline"} size="sm" onClick={() => setStatus(item)}>
                            {formatProjectStatus(item)} ({stats.byStatus[item] || 0})
                        </Button>
                    ))}
                </div>
                <Button variant="outline" asChild>
                    <Link href="/projects">Browse all projects</Link>
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : projects.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <FolderGit2 className="mb-4 h-12 w-12 text-muted-foreground/30" />
                        <h2 className="text-lg font-semibold text-foreground">No projects found</h2>
                        <p className="mt-2 text-sm text-muted-foreground">Create a project or clear the current status filter.</p>
                        <Button asChild className="mt-5">
                            <Link href="/projects/create"><Plus className="h-4 w-4" /> Create Project</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {projects.map((project) => {
                        const roleCount = projectPositionsCount(project)
                        const progress = project.status === "COMPLETED" ? 100 : project.status === "IN_PROGRESS" ? 60 : project.status === "ON_HOLD" ? 35 : 15

                        return (
                            <Card key={project.id} className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => router.push(`/projects/${project.id}`)}>
                                <CardHeader className="space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <CardTitle className="line-clamp-2 text-lg">{project.title}</CardTitle>
                                        <Badge variant={project.visibility === "PRIVATE" ? "secondary" : "outline"} className="shrink-0 text-[10px]">
                                            {project.visibility.toLowerCase()}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        <Badge variant="outline">{formatProjectStatus(project.status)}</Badge>
                                        {project.featured ? <Badge variant="secondary">Featured</Badge> : null}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="line-clamp-3 min-h-[60px] text-sm leading-5 text-muted-foreground">{project.description}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {project.technologies.slice(0, 4).map((technology) => (
                                            <Badge key={technology} variant="secondary" className="text-[10px]">{technology}</Badge>
                                        ))}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>Delivery progress</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <Progress value={progress} />
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{project.views} views</span>
                                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{roleCount} roles</span>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
