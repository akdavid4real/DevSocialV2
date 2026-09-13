"use client"

import { useState } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import { COMMUNITY_CATEGORIES, CommunityCategory, createCommunity } from "@/lib/communities"
import { useRouter } from "@/lib/navigation"
import Link from "@/components/ui/link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function CreateCommunityPage() {
    const router = useRouter()
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [category, setCategory] = useState<CommunityCategory>("GENERAL")
    const [tags, setTags] = useState("")
    const [rules, setRules] = useState(["Be respectful", "Keep posts relevant", "No spam"])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setError("")
        setLoading(true)

        try {
            const community = await createCommunity({
                name,
                description,
                category,
                tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
                rules: rules.map((rule) => rule.trim()).filter(Boolean),
                isPrivate: false,
            })
            router.push(`/communities/${community.slug}`)
        } catch (err: any) {
            setError(err?.error || err?.message || "Failed to create community")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <Link href="/communities" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Back to communities
            </Link>

            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Create Community</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Start a focused space around a stack, topic, or developer path.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Community Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder="React Developers"
                                required
                                minLength={3}
                                maxLength={50}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                placeholder="A focused space for React patterns, tooling, debugging, and product UI work."
                                required
                                minLength={10}
                                maxLength={500}
                                className="min-h-[120px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <select
                                id="category"
                                value={category}
                                onChange={(event) => setCategory(event.target.value as CommunityCategory)}
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                            >
                                {COMMUNITY_CATEGORIES.map((item) => (
                                    <option key={item} value={item}>{item}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tags">Tags</Label>
                            <Input
                                id="tags"
                                value={tags}
                                onChange={(event) => setTags(event.target.value)}
                                placeholder="react, frontend, ui"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label>Rules</Label>
                            {rules.map((rule, index) => (
                                <Input
                                    key={index}
                                    value={rule}
                                    onChange={(event) => {
                                        const nextRules = [...rules]
                                        nextRules[index] = event.target.value
                                        setRules(nextRules)
                                    }}
                                    placeholder={`Rule ${index + 1}`}
                                />
                            ))}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => router.push("/communities")}>
                                Cancel
                            </Button>
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
