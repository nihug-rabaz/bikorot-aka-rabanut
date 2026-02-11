export const dynamic = "force-dynamic"

import Link from "next/link"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { AuditsList } from "@/components/audits/audits-list"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export default async function AuditsPage() {
  const session = await getServerSession(authOptions)
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN"

  let auditWhere: { OR: { creatorId?: string; inspectors?: { some: { id: string } } }[] } | { id: string } | undefined
  if (!isAdmin) {
    const inspector = session?.user?.email
      ? await prisma.inspector.findFirst({ where: { email: session.user.email } })
      : null
    if (inspector) {
      auditWhere = {
        OR: [
          { creatorId: inspector.id },
          { inspectors: { some: { id: inspector.id } } },
        ],
      }
    } else {
      auditWhere = { id: "" }
    }
  }

  const [audits, allInspectors] = await Promise.all([
    prisma.audit.findMany({
      where: auditWhere,
      include: { inspectors: true, creator: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.inspector.findMany({ orderBy: { name: "asc" } }),
  ])

  const serialized = audits.map((a: any) => ({
    id: a.id,
    unitName: a.unitName,
    date: a.date.toISOString(),
    rabbiName: a.rabbiName,
    finalScore: a.finalScore,
    status: a.status || "DRAFT",
    isLocked: a.isLocked ?? false,
    inspectors: [...a.inspectors]
      .sort((i1: any, i2: any) => {
        if (!a.creatorId) return 0
        if (i1.id === a.creatorId) return -1
        if (i2.id === a.creatorId) return 1
        return 0
      })
      .map((i: any) => ({ id: i.id, name: i.name })),
  }))

  return (
    <div className="min-h-dvh bg-muted/20" dir="rtl">
      <header className="border-b bg-card px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-foreground">ניהול ביקורות</h1>
            <p className="text-xs text-muted-foreground font-medium">מעקב, עריכה וייצוא נתונים</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/" className="gap-2">
                <ArrowRight className="size-4" />
                ביקורת חדשה
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4">
        <AuditsList audits={serialized} allInspectors={allInspectors.map((i) => ({ id: i.id, name: i.name }))} />
      </main>
    </div>
  )
}