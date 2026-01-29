export const dynamic = "force-dynamic"

import { prisma } from "@/lib/prisma"
import { AuditForm } from "@/components/audit-form/audit-form"

export default async function HomePage() {
  const [categories, inspectors] = await Promise.all([
    prisma.category.findMany({
      orderBy: { order: "asc" },
      include: { criteria: true },
    }),
    prisma.inspector.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  return <AuditForm categories={categories} inspectors={inspectors} />
}
