export const dynamic = "force-dynamic"

import { prisma } from "@/lib/prisma"
import { ARCHIVED_CATEGORY_NAME } from "@/lib/form-editor/constants"
import { AuditForm } from "@/components/audit-form/audit-form"
import { OfflineErrorBoundary } from "@/components/offline-error-boundary"

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ fresh?: string }>
}) {
  const params = await searchParams
  const forceFresh = Boolean(params?.fresh)

  if (forceFresh && process.env.NODE_ENV === "development") {
    console.log("[HomePage] fresh intent detected")
  }

  const [categories, inspectors] = await Promise.all([
    prisma.category.findMany({
      where: {
        name: { not: ARCHIVED_CATEGORY_NAME },
        criteria: { some: { isActive: true } },
      },
      orderBy: { order: "asc" },
      include: {
        criteria: {
          where: { isActive: true },
          orderBy: { order: "asc" },
        },
      },
    }),
    prisma.inspector.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <OfflineErrorBoundary>
      <AuditForm categories={categories} inspectors={inspectors} forceFresh={forceFresh} />
    </OfflineErrorBoundary>
  )
}
