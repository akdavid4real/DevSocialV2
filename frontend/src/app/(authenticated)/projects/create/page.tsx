"use client"

import { useState } from "react"
import { ArrowLeft, Loader2, Plus, X } from "lucide-react"
import { createProject, ProjectStatus, PROJECT_STATUSES, formatProjectStatus } from "@/lib/projects"
import { useRouter } from "@/lib/navigation"
import Link from "@/components/ui/link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function CreateProjectPage() {
    const router = useRouter()
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [technologyInput, setTechnologyInput] = useState("")
    const [technologies, setTechnologies] = useState<string[]>([])
    const [githubUrl, setGithubUrl] = useState("")
    const [liveUrl, setLiveUrl] = useState("")
    const [status, setStatus] = useState<ProjectStatus>("IN_PROGRESS")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const addTechnology = () => {
        const value = technologyInput.trim()
        if (!value || technologies.includes(value)) return
        setTechnologies((previous) => [...previous, value])
        setTechnologyInput("")
    }

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setError("")
        setLoading(true)

        try {
            const project = await createProject({
                title,
                description,
                technologies,
                githubUrl: githubUrl || undefined,
                liveUrl: liveUrl || undefined,
                status,
            })
            router.push(`/projects/${project.id}`)
        } catch (err: any) {
            setError(err?.error || err?.message || "Failed to create project")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Back to projects
            </Link>

            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Add Project</h1>
                <p className="mt-1 text-sm text-muted-foreground">Share what you are building with the DevSocial community.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Project Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3} maxLength={100} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                required
                                minLength={20}
                                className="min-h-[150px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Technologies</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={technologyInput}
                                    onChange={(event) => setTechnologyInput(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            event.preventDefault()
                                            addTechnology()
                                        }
                                    }}
                                    placeholder="React"
                                />
                                <Button type="button" variant="outline" onClick={addTechnology}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {technologies.map((technology) => (
                                    <Badge key={technology} variant="secondary" className="gap-1">
                                        {technology}
                                        <button type="button" onClick={() => setTechnologies((previous) => previous.filter((item) => item !== technology))}>
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="githubUrl">GitHub URL</Label>
                                <Input id="githubUrl" type="url" value={githubUrl} onChange={(event) => setGithubUrl(event.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="liveUrl">Live URL</Label>
                                <Input id="liveUrl" type="url" value={liveUrl} onChange={(event) => setLiveUrl(event.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <select
                                id="status"
                                value={status}
                                onChange={(event) => setStatus(event.target.value as ProjectStatus)}
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                            >
                                {PROJECT_STATUSES.map((item) => (
                                    <option key={item} value={item}>{formatProjectStatus(item)}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => router.push("/projects")}>Cancel</Button>
                            <Button type="submit" className="flex-1" disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                Create
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
