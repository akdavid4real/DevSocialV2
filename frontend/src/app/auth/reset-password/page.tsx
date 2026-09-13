"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2, Lock } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "@/lib/navigation"
import Link from "@/components/ui/link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ResetPasswordPage() {
    const router = useRouter()
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [sessionReady, setSessionReady] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
            if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
                setSessionReady(true)
            }
        })

        supabase.auth.getSession().then(({ data }) => {
            if (data.session) {
                setSessionReady(true)
            }
        })

        return () => subscription.subscription.unsubscribe()
    }, [])

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setError("")

        if (password.length < 8) {
            setError("Password must be at least 8 characters.")
            return
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.")
            return
        }

        setLoading(true)
        const { error: updateError } = await supabase.auth.updateUser({ password })
        setLoading(false)

        if (updateError) {
            setError(updateError.message)
            return
        }

        setSuccess(true)
        window.setTimeout(() => router.push("/auth/login"), 1500)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-xl border bg-card text-card-foreground">
                <CardHeader className="space-y-3 text-center">
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                        {success ? <CheckCircle2 className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold text-foreground">
                            Choose a new password
                        </CardTitle>
                        <CardDescription className="mt-2 text-muted-foreground">
                            Finish resetting your DevSocial account password.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    {success ? (
                        <Alert>
                            <AlertDescription>Password updated. Redirecting to login...</AlertDescription>
                        </Alert>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {!sessionReady && (
                                <Alert>
                                    <AlertDescription>
                                        Open this page from the password reset email before choosing a new password.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {error && (
                                <Alert variant="destructive">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="password">New password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    required
                                    disabled={loading || !sessionReady}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    required
                                    disabled={loading || !sessionReady}
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={loading || !sessionReady}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Updating password...
                                    </>
                                ) : (
                                    "Update password"
                                )}
                            </Button>

                            <Link
                                href="/auth/login"
                                className="block text-center text-sm text-muted-foreground hover:text-foreground"
                            >
                                Back to login
                            </Link>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
