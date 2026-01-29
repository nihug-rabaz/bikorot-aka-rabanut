export const dynamic = "force-dynamic"

import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { AuditsList } from "@/components/audits/audits-list"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export default async function AuditsPage() {
  const audits = await prisma.audit.findMany({
    include: { inspectors: true },
    orderBy: { createdAt: "desc" },
  })

  const serialized = audits.map((a) => ({
    id: a.id,
    unitName: a.unitName,
    date: a.date.toISOString(),
    rabbiName: a.rabbiName,
    finalScore: a.finalScore,
    inspectors: a.inspectors.map((i) => ({ id: i.id, name: i.name })),
  }))

  return (
    <div className="min-h-dvh bg-background" dir="rtl">
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-foreground">ביקורות</h1>
          <Button variant="outline" size="sm" asChild>
            <Link href="/" className="gap-2">
              <ArrowRight className="size-4" aria-hidden />
              חזרה לביקורת חדשה
            </Link>
          </Button>
        </div>
      </header>
      <AuditsList audits={serialized} />
    </div>
  )
}
