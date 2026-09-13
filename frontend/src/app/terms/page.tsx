import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-muted/40 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: 2026-05-29</p>
          </CardHeader>
          <CardContent className="space-y-6 text-sm leading-relaxed text-muted-foreground">
            <section>
              <h2 className="text-foreground text-lg font-semibold">1. Acceptance of Terms</h2>
              <p>
                By using DevSocial, you agree to these terms. If you do not agree, please discontinue use
                of this service.
              </p>
            </section>

            <section>
              <h2 className="text-foreground text-lg font-semibold">2. Use License</h2>
              <p>Temporary, non-exclusive use is granted for personal, non-commercial access only. You may not:</p>
              <ul className="mt-2 list-disc pl-6 space-y-1">
                <li>modify or copy platform materials for redistribution,</li>
                <li>use materials for unauthorized commercial purposes,</li>
                <li>reverse-engineer platform software,</li>
                <li>remove copyright or ownership notices.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-foreground text-lg font-semibold">3. User Accounts</h2>
              <p>
                Keep your account details secure and up to date. You are responsible for activity on your account.
              </p>
            </section>

            <section>
              <h2 className="text-foreground text-lg font-semibold">4. Content Rules</h2>
              <p>You agree not to post harmful, abusive, hateful, or fraudulent content.</p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
