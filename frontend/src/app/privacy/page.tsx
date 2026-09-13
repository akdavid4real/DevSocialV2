import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-muted/40 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: 2026-05-29</p>
          </CardHeader>
          <CardContent className="space-y-6 text-sm leading-relaxed text-muted-foreground">
            <section>
              <h2 className="text-foreground text-lg font-semibold">Information We Collect</h2>
              <p>We collect account data, profile information, and usage activity needed to run and improve the platform.</p>
            </section>

            <section>
              <h2 className="text-foreground text-lg font-semibold">How We Use It</h2>
              <ul className="mt-2 list-disc pl-6 space-y-1">
                <li>operate features and support your account</li>
                <li>protect platform security and prevent abuse</li>
                <li>improve product quality through analytics and feedback</li>
              </ul>
            </section>

            <section>
              <h2 className="text-foreground text-lg font-semibold">Your Rights</h2>
              <p>You can request a data export or delete your account from settings. You can also opt out of optional notifications.</p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
