"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    void fetch("/api/logs/client-exception", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        pathname: window.location.pathname,
      }),
    })
  }, [error])

  return (
    <html lang="he" dir="rtl">
      <body className="font-sans antialiased">
        <div className="min-h-dvh flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-xl border bg-card p-6 space-y-4 text-center">
            <h1 className="text-2xl font-bold">אירעה שגיאה</h1>
            <p className="text-sm text-muted-foreground">המערכת נתקלה בתקלה לא צפויה.</p>
            <Button onClick={reset} className="w-full">
              נסה שוב
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}
