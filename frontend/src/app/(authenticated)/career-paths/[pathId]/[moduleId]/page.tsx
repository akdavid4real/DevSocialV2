"use client"

import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink } from "lucide-react"
import { formatDifficulty, getAdjacentModules, useCareerPath } from "@/lib/career-paths"
import { useParams } from "@/lib/navigation"
import Link from "@/components/ui/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CareerModulePage() {
    const params = useParams()
    const pathId = typeof params.pathId === "string" ? params.pathId : ""
    const moduleId = typeof params.moduleId === "string" ? params.moduleId : ""
    const { data: path, isPending, isError, error, refetch } = useCareerPath(pathId)
    const module = path?.modules.find((item) => item.id === moduleId)
    const adjacent = getAdjacentModules(path, moduleId)

    if (isPending) return <p role="status">Loading lesson...</p>
    if (isError && (error as { statusCode?: number })?.statusCode !== 404) return <div role="alert">Unable to load lesson. <Button onClick={() => refetch()}>Retry</Button></div>

    if (!path || !module) {
        return (
            <div className="mx-auto max-w-3xl space-y-4">
                <Button variant="ghost" asChild>
                    <Link href="/career-paths"><ArrowLeft className="h-4 w-4" /> Career Paths</Link>
                </Button>
                <Card>
                    <CardContent className="py-16 text-center">
                        <h1 className="text-2xl font-bold text-foreground">Module not found</h1>
                        <p className="mt-2 text-sm text-muted-foreground">Return to the path list and choose an available module.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <Button variant="ghost" asChild>
                <Link href={`/career-paths/${path.id}`}><ArrowLeft className="h-4 w-4" /> {path.title}</Link>
            </Button>

            <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{formatDifficulty(module.difficulty)}</Badge>
                    <Badge variant="secondary">{module.duration}</Badge>
                    <Badge variant="secondary">{path.title}</Badge>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{module.title}</h1>
                <p className="max-w-3xl text-base leading-7 text-muted-foreground">{module.description}</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                <main className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Lesson</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {module.lesson.map((block, index) => {
                                if (block.type === "paragraph") {
                                    return <p key={index} className="text-sm leading-7 text-muted-foreground">{block.content}</p>
                                }

                                if (block.type === "list") {
                                    return (
                                        <ul key={index} className="space-y-2">
                                            {block.items.map((item) => (
                                                <li key={item} className="flex gap-2 text-sm leading-6 text-muted-foreground">
                                                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )
                                }

                                return (
                                    <div key={index} className="overflow-hidden rounded-lg border border-border bg-muted/30">
                                        <div className="border-b border-border px-4 py-2 text-xs font-medium uppercase text-muted-foreground">{block.language}</div>
                                        <pre className="overflow-x-auto p-4 text-sm leading-6 text-foreground"><code>{block.code}</code></pre>
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Practice</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm leading-7 text-muted-foreground">{module.exercise}</p>
                        </CardContent>
                    </Card>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {adjacent.previous ? (
                            <Button variant="outline" asChild>
                                <Link href={`/career-paths/${path.id}/${adjacent.previous.id}`}>
                                    <ArrowLeft className="h-4 w-4" />
                                    {adjacent.previous.title}
                                </Link>
                            </Button>
                        ) : <span />}
                        {adjacent.next ? (
                            <Button asChild>
                                <Link href={`/career-paths/${path.id}/${adjacent.next.id}`}>
                                    {adjacent.next.title}
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        ) : (
                            <Button asChild>
                                <Link href={`/career-paths/${path.id}`}>Back to path</Link>
                            </Button>
                        )}
                    </div>
                </main>

                <aside className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Outcomes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {module.outcomes.map((outcome) => (
                                <div key={outcome} className="flex gap-2 text-sm text-muted-foreground">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                    <span>{outcome}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Resources</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {module.resources.map((resource) => {
                                const isExternal = resource.href.startsWith("http")
                                if (isExternal) {
                                    return (
                                        <a
                                            key={resource.href}
                                            href={resource.href}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/40"
                                        >
                                            {resource.label}
                                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                        </a>
                                    )
                                }

                                return (
                                    <Link
                                        key={resource.href}
                                        href={resource.href}
                                        className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/40"
                                    >
                                        {resource.label}
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                    </Link>
                                )
                            })}
                        </CardContent>
                    </Card>
                </aside>
            </div>
        </div>
    )
}
