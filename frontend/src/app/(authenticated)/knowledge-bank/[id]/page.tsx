"use client"

import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, Code, Loader2 } from "lucide-react"
import { formatKnowledgeCategory, getKnowledgeEntry, KnowledgeEntry } from "@/lib/knowledge"
import { useParams, useRouter } from "@/lib/navigation"
import Link from "@/components/ui/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function KnowledgeEntryDetailPage() {
    const params = useParams()
    const id = String(params.id || "")
    const router = useRouter()
    const [entry, setEntry] = useState<KnowledgeEntry | null>(null)
    const [loading, setLoading] = useState(true)

    const loadEntry = useCallback(async () => {
        if (!id) return
        setLoading(true)
        try {
            setEntry(await getKnowledgeEntry(id))
        } catch (error) {
            console.error("Failed to load knowledge entry:", error)
            setEntry(null)
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => {
        loadEntry()
    }, [loadEntry])

    if (loading) {
        return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    }

    if (!entry) {
        return (
            <div className="py-20 text-center">
                <h1 className="text-2xl font-bold text-foreground">Knowledge entry not found</h1>
                <Button variant="outline" className="mt-4" onClick={() => router.push("/knowledge-bank")}>Back to knowledge bank</Button>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <Link href="/knowledge-bank" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Back to knowledge bank
            </Link>

            <Card>
                <CardHeader className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge>{entry.technology}</Badge>
                        <Badge variant="outline">{formatKnowledgeCategory(entry.category)}</Badge>
                    </div>
                    <CardTitle className="text-3xl">{entry.title}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={entry.author?.avatar || undefined} />
                            <AvatarFallback>{entry.author?.displayName?.[0] || entry.author?.username?.[0] || "?"}</AvatarFallback>
                        </Avatar>
                        <span>{entry.author?.displayName || entry.author?.username || "Unknown"}</span>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">{entry.content}</p>
                    {entry.codeExample && (
                        <div className="overflow-hidden rounded-lg border border-border">
                            <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground">
                                <Code className="h-4 w-4" />
                                Code example
                            </div>
                            <pre className="overflow-x-auto bg-zinc-950 p-4 text-sm text-zinc-100"><code>{entry.codeExample}</code></pre>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                        {entry.tags.map((tag) => <Badge key={tag} variant="secondary">#{tag}</Badge>)}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
