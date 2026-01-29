"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import type { GeneralDetails, AnswersByCriterionId } from "@/components/audit-form/types"

interface SaveAuditParams {
  generalDetails: GeneralDetails
  answers: AnswersByCriterionId
  selectedInspectorIds: string[]
}

const SUMMARY_LABELS = {
  summaryEvaluation: "הערכת מבקר",
  recommendations: "המלצות מבקר",
  finalScore: "ציון",
} as const

export async function saveAudit(data: SaveAuditParams) {
  try {
    const audit = await prisma.audit.create({
      data: {
        unitName: data.generalDetails.unitName,
        rabbiName: data.generalDetails.rabbiName,
        rabbiSeniority: data.generalDetails.rabbiSeniority,
        rabbiIdNumber: data.generalDetails.rabbiIdNumber,
        ncoName: data.generalDetails.ncoName,
        ncoSeniority: data.generalDetails.ncoSeniority,
        ncoIdNumber: data.generalDetails.ncoIdNumber,
        summaryEvaluation: null,
        recommendations: null,
        finalScore: null,
        status: "DRAFT",
        ...(data.selectedInspectorIds.length > 0 && {
          inspectors: { connect: data.selectedInspectorIds.map((id) => ({ id })) },
        }),
      },
    })

    for (const [criterionId, entry] of Object.entries(data.answers)) {
      if (entry.value === undefined && entry.comment === undefined) continue
      await prisma.answer.upsert({
        where: {
          auditId_criterionId: { auditId: audit.id, criterionId },
        },
        create: {
          auditId: audit.id,
          criterionId,
          value: entry.value ?? null,
          comment: entry.comment ?? null,
        },
        update: {
          value: entry.value ?? null,
          comment: entry.comment ?? null,
        },
      })
    }

    const summaryCategory = await prisma.category.findFirst({
      where: { name: "סיכום" },
      include: { criteria: true },
    })

    if (summaryCategory) {
      const byLabel: Record<string, string | null> = {}
      for (const c of summaryCategory.criteria) {
        const entry = data.answers[c.id]
        byLabel[c.label] = entry?.value ?? null
      }
      await prisma.audit.update({
        where: { id: audit.id },
        data: {
          summaryEvaluation: byLabel[SUMMARY_LABELS.summaryEvaluation] ?? null,
          recommendations: byLabel[SUMMARY_LABELS.recommendations] ?? null,
          finalScore: byLabel[SUMMARY_LABELS.finalScore] ?? null,
        },
      })
    }

    revalidatePath("/")
    return { success: true, auditId: audit.id }
  } catch (error) {
    console.error("Error saving audit:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
