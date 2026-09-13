"use client"

import { useEffect, useState } from "react"
import { ExternalLink, Eye, FolderGit2, Github, Loader2, Plus, Search } from "lucide-react"
import { formatProjectStatus, getProjects, Project, PROJECT_STATUSES } from "@/lib/projects"
import { useRouter } from "@/lib/navigation"
import Link from "@/components/ui/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function ProjectsPage() {
    const router = useRouter()
    const [projects, setProjects] = useState<Project[]>([])
    const [search, setSearch] = useState("")
    const [status, setStatus] = useState("")
    const [tech, setTech] = useState("")
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        const loadProjects = async () => {
            setLoading(true)
            try {
                const data = await getProjects({ search, status, tech, limit: 24 })
                if (!cancelled) setProjects(data.projects)
            } catch (error) {
                console.error("Failed to load projects:", error)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        const timeout = window.setTimeout(loadProjects, 200)
        return () => {
            cancelled = true
            window.clearTimeout(timeout)
        }
    }, [search, status, tech])

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Projects</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Discover what developers are building and share your own work.
                    </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" asChild className="w-full sm:w-auto">
                        <Link href="/projects/my">
                            <FolderGit2 className="h-4 w-4" />
                            My Projects
                        </Link>
                    </Button>
                    <Button asChild className="w-full sm:w-auto">
                        <Link href="/projects/create">
                            <Plus className="h-4 w-4" />
                            Add Project
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects..." className="pl-10" />
                </div>
                <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                >
                    <option value="">All statuses</option>
                    {PROJECT_STATUSES.map((item) => (
                        <option key={item} value={item}>{formatProjectStatus(item)}</option>
                    ))}
                </select>
                <Input value={tech} onChange={(event) => setTech(event.target.value)} placeholder="Technology..." />
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : projects.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center text-sm text-muted-foreground">
                        No projects found.
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {projects.map((project) => (
                        <Card key={project.id} className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => router.push(`/projects/${project.id}`)}>
                            <CardHeader className="space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <CardTitle className="line-clamp-2 text-lg">{project.title}</CardTitle>
                                    <Badge variant="outline" className="shrink-0 text-[10px]">{formatProjectStatus(project.status)}</Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-7 w-7">
                                        <AvatarImage src={project.author?.avatar || undefined} />
                                        <AvatarFallback>{project.author?.displayName?.[0] || project.author?.username?.[0] || "?"}</AvatarFallback>
                                    </Avatar>
                                    <span className="truncate text-sm text-muted-foreground">{project.author?.displayName || project.author?.username}</span>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="line-clamp-3 min-h-[60px] text-sm leading-5 text-muted-foreground">{project.description}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {project.technologies.slice(0, 4).map((technology) => (
                                        <Badge key={technology} variant="secondary" className="text-[10px]">{technology}</Badge>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{project.views}</span>
                                    <span className="flex items-center gap-2">
                                        {project.githubUrl && <Github className="h-3.5 w-3.5" />}
                                        {project.liveUrl && <ExternalLink className="h-3.5 w-3.5" />}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
