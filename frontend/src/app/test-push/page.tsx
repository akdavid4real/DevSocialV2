import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

export default function TestPushPage() {
  return (
    <div className="mx-auto mt-16 max-w-2xl px-4">
      <Card>
        <CardHeader>
          <CardTitle>Push Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTitle>Migration note</AlertTitle>
            <AlertDescription>Push notification test route remains a migration stub.</AlertDescription>
          </Alert>
          <p className="text-sm text-muted-foreground">
            Legacy `/test-push` route is kept as a documented migration stub.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
