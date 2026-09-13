import { WifiOff } from "lucide-react"

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <WifiOff className="h-24 w-24 text-muted-foreground" />
      <h1 className="mt-6 text-3xl font-bold">You are Offline</h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        DevSocial could not detect an active network connection. Some features may not be available.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 inline-flex rounded-md border border-border px-4 py-2 text-sm font-medium"
      >
        Try Again
      </button>
    </div>
  )
}
