"use client"

import { useState } from "react"
import { ArrowLeft, Loader2, Plus, X } from "lucide-react"
import { createKnowledgeEntry, formatKnowledgeCategory, KnowledgeCategory, KNOWLEDGE_CATEGORIES } from "@/lib/knowledge"
import { useRouter } from "@/lib/navigation"
import Link from "@/components/ui/link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function CreateKnowledgeEntryPage() {
    const router = useRouter()
    const [title, setTitle] = useState("")
    const [technology, setTechnology] = useState("")
    const [category, setCategory] = useState<KnowledgeCategory>("QUICK_TIP")
    const [content, setContent] = useState("")
    const [codeExample, setCodeExample] = useState("")
    const [tagInput, setTagInput] = useState("")
    const [tags, setTags] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const addTag = () => {
        const tag = tagInput.trim().replace(/^#/, "")
        if (!tag || tags.includes(tag)) return
        setTags((previous) => [...previous, tag])
        setTagInput("")
    }

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setError("")
        setLoading(true)

        try {
            const entry = await createKnowledgeEntry({
                title,
                technology,
                category,
                content,
                codeExample: codeExample || undefined,
                tags,
            })
            router.push(`/knowledge-bank/${entry.id}`)
        } catch (err: any) {
            setError(err?.error || err?.message || "Failed to create knowledge entry")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <Link href="/knowledge-bank" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Back to knowledge bank
            </Link>

            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Add Knowledge</h1>
                <p className="mt-1 text-sm text-muted-foreground">Save a reusable note, example, or fix for other developers.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Entry Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3} maxLength={200} />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="technology">Technology</Label>
                                <Input id="technology" value={technology} onChange={(event) => setTechnology(event.target.value)} placeholder="TypeScript" required minLength={2} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <select id="category" value={category} onChange={(event) => setCategory(event.target.value as KnowledgeCategory)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">
                                    {KNOWLEDGE_CATEGORIES.map((item) => <option key={item} value={item}>{formatKnowledgeCategory(item)}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="content">Content</Label>
                            <Textarea id="content" value={content} onChange={(event) => setContent(event.target.value)} required minLength={20} className="min-h-[180px]" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="codeExample">Code example</Label>
                            <Textarea id="codeExample" value={codeExample} onChange={(event) => setCodeExample(event.target.value)} className="min-h-[140px] font-mono text-sm" />
                        </div>

                        <div className="space-y-2">
                            <Label>Tags</Label>
                            <div className="flex gap-2">
                                <Input value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTag() } }} placeholder="hooks" />
                                <Button type="button" variant="outline" onClick={addTag}><Plus className="h-4 w-4" /></Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="gap-1">
                                        #{tag}
                                        <button type="button" onClick={() => setTags((previous) => previous.filter((item) => item !== tag))}>
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => router.push("/knowledge-bank")}>Cancel</Button>
                            <Button type="submit" className="flex-1" disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                Save
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
