"use client"
import React, { useState, useEffect } from "react"
import { useRouter } from "@/lib/navigation"
import Link from "@/components/ui/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, Eye, EyeOff } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { getAffiliations } from "@/lib/api"
import { toast } from "sonner"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export default function SignupPage() {
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        firstName: "",
        lastName: "",
        birthMonth: "",
        birthDay: "",
        affiliation: "",
        affiliationType: "techBootcamps"
    })
    const [acceptedTerms, setAcceptedTerms] = useState(false)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [affiliations, setAffiliations] = useState<Record<string, string[]>>({})
    const [loadingAffiliations, setLoadingAffiliations] = useState(true)
    const [affiliationOpen, setAffiliationOpen] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const { signup } = useAuth()
    const router = useRouter()
    const [referralCode, setReferralCode] = useState<string | null>(null)

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const refCode = urlParams.get('ref')
        if (refCode) {
            setReferralCode(refCode)
        }
    }, [])

    useEffect(() => {
        const fetchAffiliations = async () => {
            try {
                const response = await getAffiliations();
                // Response from interceptor is already the data if success
                // Based on backend interceptor: { success: true, data: { ... } }
                if (response && typeof response === 'object') {
                    // Check if it's the raw flat map or wrapped
                    const data = response.data || response;
                    setAffiliations(data || {});
                } else {
                    // Provide fallback affiliations if API fails
                    setAffiliations({
                        techBootcamps: ['Other', 'General Assembly', 'Lambda School', 'App Academy'],
                        federal: ['Other', 'University of Lagos', 'University of Ibadan', 'Ahmadu Bello University'],
                        state: ['Other', 'Lagos State University', 'Rivers State University'],
                        privateUniversities: ['Other', 'Covenant University', 'Babcock University'],
                        affiliatedInstitutions: ['Other', 'Various Affiliated Institutions'],
                        distanceLearning: ['Other', 'National Open University']
                    });
                }
            } catch (error: any) {
                console.error("Failed to fetch affiliations:", error);
                setAffiliations({
                    techBootcamps: ['Other', 'General Assembly', 'Lambda School', 'App Academy'],
                    federal: ['Other', 'University of Lagos', 'University of Ibadan', 'Ahmadu Bello University'],
                    state: ['Other', 'Lagos State University', 'Rivers State University'],
                    privateUniversities: ['Other', 'Covenant University', 'Babcock University'],
                    affiliatedInstitutions: ['Other', 'Various Affiliated Institutions'],
                    distanceLearning: ['Other', 'National Open University']
                });
            } finally {
                setLoadingAffiliations(false);
            }
        };
        fetchAffiliations();
    }, [])

    useEffect(() => {
        setAffiliationOpen(false);
    }, [formData.affiliationType])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (!formData.firstName.trim()) return toast.error("First name is required");
        if (!formData.lastName.trim()) return toast.error("Last name is required");
        if (!formData.username.trim()) return toast.error("Username is required");
        if (formData.password !== formData.confirmPassword) return toast.error("Passwords do not match");
        if (!acceptedTerms) return toast.error("You must accept the terms");

        setLoading(true)

        try {
            await signup({
                ...formData,
                birthMonth: parseInt(formData.birthMonth),
                birthDay: parseInt(formData.birthDay),
                referralCode: referralCode || undefined,
            })
            toast.success("Account created! Please enter the 6-digit code sent to your email.")
            router.push(`/auth/verify?email=${encodeURIComponent(formData.email)}`)
        } catch (err: any) {
            console.error("Signup error:", err);
            // Extract message from NestJS validation error if it exists
            const errorMessage = typeof err.message === 'object' && Array.isArray(err.message)
                ? err.message[0]
                : err.message || "Signup failed";
            setError(errorMessage)
            toast.error(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-12 px-4 sm:px-6 lg:px-8 relative">
            <div className="absolute top-4 right-4 z-50">
                <ThemeToggle />
            </div>
            <Card className="w-full max-w-md shadow-xl border bg-card text-card-foreground">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700 rounded-lg flex items-center justify-center mb-4">
                        <span className="text-foreground font-bold text-xl">TC</span>
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground">Join DevSocial</CardTitle>
                    <CardDescription className="text-muted-foreground">Create your account and start connecting with fellow developers</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input
                                    id="firstName"
                                    name="firstName"
                                    type="text"
                                    required
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    placeholder="John"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input
                                    id="lastName"
                                    name="lastName"
                                    type="text"
                                    required
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    placeholder="Doe"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                name="username"
                                type="text"
                                required
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="Choose a unique username"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter your email address"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="birthMonth">Birth Month</Label>
                                <Select value={formData.birthMonth} onValueChange={(value) => setFormData({ ...formData, birthMonth: value })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">January</SelectItem>
                                        <SelectItem value="2">February</SelectItem>
                                        <SelectItem value="3">March</SelectItem>
                                        <SelectItem value="4">April</SelectItem>
                                        <SelectItem value="5">May</SelectItem>
                                        <SelectItem value="6">June</SelectItem>
                                        <SelectItem value="7">July</SelectItem>
                                        <SelectItem value="8">August</SelectItem>
                                        <SelectItem value="9">September</SelectItem>
                                        <SelectItem value="10">October</SelectItem>
                                        <SelectItem value="11">November</SelectItem>
                                        <SelectItem value="12">December</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="birthDay">Birth Day</Label>
                                <Select value={formData.birthDay} onValueChange={(value) => setFormData({ ...formData, birthDay: value })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select day" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                            <SelectItem key={day} value={day.toString()}>
                                                {day}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="affiliationType">Affiliation Type</Label>
                            <Select value={formData.affiliationType} onValueChange={(value) => setFormData({ ...formData, affiliationType: value, affiliation: "" })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select affiliation type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Top_Bootcamps_Tech_Programmes">Tech Bootcamps</SelectItem>
                                    <SelectItem value="Federal">Federal Universities</SelectItem>
                                    <SelectItem value="State">State Universities</SelectItem>
                                    <SelectItem value="Private">Private Universities</SelectItem>
                                    <SelectItem value="Affiliated_Institutions">Affiliated Institutions</SelectItem>
                                    <SelectItem value="Distance_Learning">Distance Learning</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="affiliation">Affiliation</Label>
                            <Popover open={affiliationOpen} onOpenChange={setAffiliationOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={affiliationOpen}
                                        className="w-full justify-between font-normal"
                                        disabled={loadingAffiliations || !formData.affiliationType}
                                    >
                                        {formData.affiliation
                                            ? affiliations[formData.affiliationType]?.find(
                                                (affiliation) => affiliation === formData.affiliation
                                            )
                                            : loadingAffiliations
                                                ? "Loading..."
                                                : "Search and select your affiliation..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0">
                                    <Command>
                                        <CommandInput placeholder="Search affiliations..." />
                                        <CommandList>
                                            <CommandEmpty>No affiliation found.</CommandEmpty>
                                            <CommandGroup>
                                                {affiliations[formData.affiliationType]?.map((affiliation) => (
                                                    <CommandItem
                                                        key={affiliation}
                                                        value={affiliation}
                                                        onSelect={(currentValue) => {
                                                            setFormData({ ...formData, affiliation: currentValue === formData.affiliation ? "" : currentValue })
                                                            setAffiliationOpen(false)
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                formData.affiliation === affiliation ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {affiliation}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Create a strong password"
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={loading}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Confirm your password"
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    disabled={loading}
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-start space-x-2">
                            <Checkbox
                                id="terms"
                                checked={acceptedTerms}
                                onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                                className="mt-1"
                            />
                            <Label htmlFor="terms" className="text-sm leading-5 cursor-pointer">
                                I agree to the Terms of Service and Privacy Policy
                            </Label>
                        </div>

                        <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading || !acceptedTerms}>
                            {loading ? "Creating account..." : "Create account"}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-muted-foreground">
                            Already have an account?{" "}
                            <Link href="/auth/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
