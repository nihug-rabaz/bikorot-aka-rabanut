"use client"

import { CalendarDays, User } from "lucide-react"

interface AuditHeaderProps {
  inspectorName: string
}

export function AuditHeader({ inspectorName }: AuditHeaderProps) {
  const today = new Date()
  const formattedDate = today.toLocaleDateString("he-IL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">טופס ביקורת</h1>
      </div>
      
      <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4" aria-hidden="true" />
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="size-4" aria-hidden="true" />
          <span>מבקר: {inspectorName}</span>
        </div>
      </div>
    </header>
  )
}
