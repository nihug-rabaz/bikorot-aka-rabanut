"use client"

import { useSession } from "next-auth/react"
import { CalendarDays, ShieldCheck, Loader2 } from "lucide-react"
import { formatHebrewDate } from "@/lib/hebrew-date"

export function AuditHeader() {
  const { data: session, status } = useSession()
  const today = new Date()
  // פונקציית עזר לקביעת האותיות הראשיות של השם
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2);
  };
  const hebrewDateStr = formatHebrewDate(today)
  const gregorianDate = today.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })
  const dayOfWeek = today.toLocaleDateString("he-IL", { weekday: "long" })

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <ShieldCheck className="size-5 text-primary" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-foreground">ביקורת אכ"א</h1>
        </div>

        {/* האוואטר המקצועי עם ראשי תיבות */}
        <div className="flex items-center justify-center size-8 rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-inner">
          {status === "loading" ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            getInitials(session?.user?.name)
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-row justify-between items-end">
        {/* תאריך (צד ימין) */}
        <div className="flex items-start gap-2.5">
          <CalendarDays className="size-4 mt-0.5 text-primary" />
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold text-foreground">{hebrewDateStr}</span>
            <span className="text-[10px] text-muted-foreground mt-1 font-medium">
              {dayOfWeek} | {gregorianDate}
            </span>
          </div>
        </div>

        {/* שם המבקר (צד שמאל) */}
        <div className="text-left">
          <p className="text-[10px] text-muted-foreground font-medium mb-0.5">מבקר רשום:</p>
          <p className="text-xs font-bold text-foreground">
            {session?.user?.name || "ממתין להתחברות..."}
          </p>
        </div>
      </div>
    </header>
  )
}