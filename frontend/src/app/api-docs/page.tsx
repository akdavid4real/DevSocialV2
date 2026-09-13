import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Alert>
        <AlertDescription>
          Vite frontend migration currently exposes API docs via backend endpoints and does not include an embedded Swagger viewer.
        </AlertDescription>
      </Alert>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Use <span className="font-semibold text-foreground">/api/docs</span> on the backend host for the live OpenAPI payload.
          </p>
          <p>
            If your dev backend runs separately, open that route directly from the backend service URL.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
