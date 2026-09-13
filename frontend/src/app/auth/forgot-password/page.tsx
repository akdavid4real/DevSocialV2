"use client"

import { useState } from "react"
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react"
import { requestPasswordReset } from "@/lib/api"
import Link from "@/components/ui/link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setError("")
        setLoading(true)

        try {
            await requestPasswordReset(email)
            setSubmitted(true)
        } catch (err: any) {
            setError(err?.error || err?.message || "Failed to process password reset request")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-xl border bg-card text-card-foreground">
                <CardHeader className="space-y-3 text-center">
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                        {submitted ? <CheckCircle2 className="h-6 w-6" /> : <Mail className="h-6 w-6" />}
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold text-foreground">
                            Reset your password
                        </CardTitle>
                        <CardDescription className="mt-2 text-muted-foreground">
                            Enter the email attached to your DevSocial account.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    {submitted ? (
                        <div className="space-y-6 text-center">
                            <Alert>
                                <AlertDescription>
                                    If an account with that email exists, a reset link has been sent.
                                </AlertDescription>
                            </Alert>
                            <Button asChild className="w-full">
                                <Link href="/auth/login">Back to login</Link>
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <Alert variant="destructive">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={loading || !email}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending reset link...
                                    </>
                                ) : (
                                    "Send reset link"
                                )}
                            </Button>

                            <Link
                                href="/auth/login"
                                className="mx-auto flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to login
                            </Link>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
