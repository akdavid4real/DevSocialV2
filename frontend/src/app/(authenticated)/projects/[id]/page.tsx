"use client"

import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, ExternalLink, Eye, Github, Loader2, Trash2 } from "lucide-react"
import { deleteProject, formatProjectStatus, getProject, Project, ProjectStatus, PROJECT_STATUSES, updateProjectStatus } from "@/lib/projects"
import { useAuth } from "@/contexts/auth-context"
import { useParams, useRouter } from "@/lib/navigation"
import Link from "@/components/ui/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ProjectDetailPage() {
    const params = useParams()
    const id = String(params.id || "")
    const router = useRouter()
    const { user } = useAuth()
    const [project, setProject] = useState<Project | null>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const loadProject = useCallback(async () => {
        if (!id) return
        setLoading(true)
        try {
            setProject(await getProject(id))
        } catch (error) {
            console.error("Failed to load project:", error)
            setProject(null)
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => {
        loadProject()
    }, [loadProject])

    const isOwner = !!user && project?.authorId === user.id

    const handleStatusChange = async (status: ProjectStatus) => {
        if (!project) return
        setUpdating(true)
        try {
            setProject(await updateProjectStatus(project.id, status))
        } catch (error) {
            console.error("Failed to update project status:", error)
        } finally {
            setUpdating(false)
        }
    }

    const handleDelete = async () => {
        if (!project || !window.confirm("Delete this project?")) return
        setDeleting(true)
        try {
            await deleteProject(project.id)
            router.push("/projects")
        } catch (error) {
            console.error("Failed to delete project:", error)
            setDeleting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!project) {
        return (
            <div className="py-20 text-center">
                <h1 className="text-2xl font-bold text-foreground">Project not found</h1>
                <Button variant="outline" className="mt-4" onClick={() => router.push("/projects")}>Back to projects</Button>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Back to projects
            </Link>

            <Card>
                <CardHeader className="space-y-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <CardTitle className="text-3xl">{project.title}</CardTitle>
                                <Badge variant="outline">{formatProjectStatus(project.status)}</Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={project.author?.avatar || undefined} />
                                    <AvatarFallback>{project.author?.displayName?.[0] || project.author?.username?.[0] || "?"}</AvatarFallback>
                                </Avatar>
                                <span>{project.author?.displayName || project.author?.username}</span>
                                <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{project.views}</span>
                            </div>
                        </div>

                        {isOwner && (
                            <div className="flex gap-2">
                                <select
                                    value={project.status}
                                    disabled={updating}
                                    onChange={(event) => handleStatusChange(event.target.value as ProjectStatus)}
                                    className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                                >
                                    {PROJECT_STATUSES.map((item) => (
                                        <option key={item} value={item}>{formatProjectStatus(item)}</option>
                                    ))}
                                </select>
                                <Button variant="destructive" size="icon" disabled={deleting} onClick={handleDelete}>
                                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">{project.description}</p>

                    <div className="flex flex-wrap gap-2">
                        {project.technologies.map((technology) => (
                            <Badge key={technology} variant="secondary">{technology}</Badge>
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {project.githubUrl && (
                            <Button asChild variant="outline">
                                <a href={project.githubUrl} target="_blank" rel="noreferrer">
                                    <Github className="h-4 w-4" />
                                    GitHub
                                </a>
                            </Button>
                        )}
                        {project.liveUrl && (
                            <Button asChild variant="outline">
                                <a href={project.liveUrl} target="_blank" rel="noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                    Live Demo
                                </a>
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
