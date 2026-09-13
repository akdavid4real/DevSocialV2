"use client"

import { FormEvent, useState } from "react"
import { ArrowLeft, Loader2, Send } from "lucide-react"
import { createFeedback, FeedbackType, FEEDBACK_TYPES, formatFeedbackType } from "@/lib/feedback"
import { useRouter } from "@/lib/navigation"
import Link from "@/components/ui/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function CreateFeedbackPage() {
    const router = useRouter()
    const [type, setType] = useState<FeedbackType>("GENERAL")
    const [subject, setSubject] = useState("")
    const [description, setDescription] = useState("")
    const [rating, setRating] = useState("")
    const [error, setError] = useState("")
    const [saving, setSaving] = useState(false)

    const submit = async (event: FormEvent) => {
        event.preventDefault()
        setError("")
        setSaving(true)

        try {
            const feedback = await createFeedback({
                type,
                subject,
                description,
                rating: rating ? Number(rating) : undefined,
            })
            router.push(`/feedback/${feedback.id}`)
        } catch (error: any) {
            setError(error?.message || "Failed to submit feedback")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <Button variant="ghost" asChild className="px-0">
                <Link href="/feedback">
                    <ArrowLeft className="h-4 w-4" />
                    Back to feedback
                </Link>
            </Button>

            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Submit Feedback</h1>
                <p className="mt-1 text-sm text-muted-foreground">Share a bug, feature idea, improvement, or general note.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Feedback details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={submit} className="space-y-5">
                        <div className="grid gap-2">
                            <Label htmlFor="type">Type</Label>
                            <select id="type" value={type} onChange={(event) => setType(event.target.value as FeedbackType)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                                {FEEDBACK_TYPES.map((item) => <option key={item} value={item}>{formatFeedbackType(item)}</option>)}
                            </select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Input id="subject" value={subject} onChange={(event) => setSubject(event.target.value)} required minLength={3} maxLength={200} placeholder="Brief summary" />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} required minLength={10} rows={8} placeholder="Include useful details, expected behavior, and steps to reproduce if this is a bug." />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="rating">Rating</Label>
                            <select id="rating" value={rating} onChange={(event) => setRating(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                                <option value="">No rating</option>
                                {[1, 2, 3, 4, 5].map((item) => <option key={item} value={item}>{item}/5</option>)}
                            </select>
                        </div>

                        {error && <p className="text-sm text-destructive">{error}</p>}

                        <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Submit
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
