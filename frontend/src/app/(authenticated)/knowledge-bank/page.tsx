"use client"

import { useEffect, useMemo, useState } from "react"
import { BookOpen, Code, Loader2, Plus, Search } from "lucide-react"
import { formatKnowledgeCategory, getKnowledgeEntries, KnowledgeEntry, KNOWLEDGE_CATEGORIES } from "@/lib/knowledge"
import { useRouter } from "@/lib/navigation"
import Link from "@/components/ui/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const TECHNOLOGIES = ["", "TypeScript", "React", "Node.js", "NestJS", "PostgreSQL", "Prisma", "Supabase", "Vite"]

export default function KnowledgeBankPage() {
    const router = useRouter()
    const [entries, setEntries] = useState<KnowledgeEntry[]>([])
    const [search, setSearch] = useState("")
    const [technology, setTechnology] = useState("")
    const [category, setCategory] = useState("")
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        const loadEntries = async () => {
            setLoading(true)
            try {
                const data = await getKnowledgeEntries({ search, technology, category, limit: 30 })
                if (!cancelled) setEntries(data.entries)
            } catch (error) {
                console.error("Failed to load knowledge entries:", error)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        const timeout = window.setTimeout(loadEntries, 200)
        return () => {
            cancelled = true
            window.clearTimeout(timeout)
        }
    }, [search, technology, category])

    const totalLikes = useMemo(() => entries.reduce((sum, entry) => sum + entry.likesCount, 0), [entries])
    const technologyCount = useMemo(() => new Set(entries.map((entry) => entry.technology)).size, [entries])

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Knowledge Bank</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Reusable developer notes, examples, fixes, and references.
                    </p>
                </div>
                <Button asChild className="w-full sm:w-auto">
                    <Link href="/knowledge-bank/create">
                        <Plus className="h-4 w-4" />
                        Add Knowledge
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <Card><CardContent className="p-4"><div className="text-2xl font-bold">{entries.length}</div><div className="text-sm text-muted-foreground">Entries</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-2xl font-bold">{technologyCount}</div><div className="text-sm text-muted-foreground">Technologies</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-2xl font-bold">{totalLikes}</div><div className="text-sm text-muted-foreground">Stored likes</div></CardContent></Card>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_180px_220px]">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search knowledge..." className="pl-10" />
                </div>
                <select value={technology} onChange={(event) => setTechnology(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    {TECHNOLOGIES.map((item) => <option key={item || "ALL"} value={item}>{item || "All tech"}</option>)}
                </select>
                <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    <option value="">All categories</option>
                    {KNOWLEDGE_CATEGORIES.map((item) => <option key={item} value={item}>{formatKnowledgeCategory(item)}</option>)}
                </select>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : entries.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/30" />
                        <h2 className="text-lg font-semibold text-foreground">No entries found</h2>
                        <p className="mt-2 text-sm text-muted-foreground">Add the first useful note for this area.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {entries.map((entry) => (
                        <Card key={entry.id} className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => router.push(`/knowledge-bank/${entry.id}`)}>
                            <CardHeader className="space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <CardTitle className="line-clamp-2 text-xl">{entry.title}</CardTitle>
                                    <Badge variant="outline" className="shrink-0">{formatKnowledgeCategory(entry.category)}</Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="secondary">{entry.technology}</Badge>
                                    {entry.tags.slice(0, 4).map((tag) => <Badge key={tag} variant="outline">#{tag}</Badge>)}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{entry.content}</p>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={entry.author?.avatar || undefined} />
                                            <AvatarFallback>{entry.author?.displayName?.[0] || entry.author?.username?.[0] || "?"}</AvatarFallback>
                                        </Avatar>
                                        <span>{entry.author?.displayName || entry.author?.username || "Unknown"}</span>
                                    </div>
                                    {entry.codeExample && <span className="flex items-center gap-1"><Code className="h-3.5 w-3.5" />Code</span>}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
