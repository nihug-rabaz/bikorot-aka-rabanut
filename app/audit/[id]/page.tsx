import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ARCHIVED_CATEGORY_NAME } from "@/lib/form-editor/constants"
import { AuditForm } from "@/components/audit-form/audit-form"
import { OfflineErrorBoundary } from "@/components/offline-error-boundary"
import type { GeneralDetails, AnswersByCriterionId } from "@/components/audit-form/types"

export const dynamic = "force-dynamic"

export default async function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (process.env.NODE_ENV === "development") {
    console.log("[AuditPage] mounted", { id })
  }

  const [audit, categories, inspectors] = await Promise.all([
    prisma.audit.findUnique({
      where: { id },
      include: { answers: true, inspectors: true },
    }),
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

  if (!audit) notFound()

  const initialGeneralDetails: GeneralDetails = {
    date: audit.date.toISOString(),
    unitName: audit.unitName,
    rabbiName: audit.rabbiName,
    rabbiRank: audit.rabbiRank,
    rabbiSeniority: audit.rabbiSeniority,
    rabbiIdNumber: audit.rabbiIdNumber,
    ncoName: audit.ncoName,
    ncoRank: audit.ncoRank,
    ncoSeniority: audit.ncoSeniority,
    ncoIdNumber: audit.ncoIdNumber,
  }

  const initialAnswers: AnswersByCriterionId = {}
  for (const a of audit.answers) {
    initialAnswers[a.criterionId] = {
      value: a.value,
      comment: a.comment,
      updatedAt: a.updatedAt.toISOString(),
    }
  }

  const initialSelectedInspectorIds = audit.inspectors.map((i) => i.id)

  return (
    <OfflineErrorBoundary>
      <AuditForm
        auditId={id}
        isLocked={audit.isLocked}
        categories={categories}
        inspectors={inspectors}
        initialGeneralDetails={initialGeneralDetails}
        initialAnswers={initialAnswers}
        initialSelectedInspectorIds={initialSelectedInspectorIds}
      />
    </OfflineErrorBoundary>
  )
}
