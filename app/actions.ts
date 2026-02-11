"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import type { GeneralDetails, AnswersByCriterionId } from "@/components/audit-form/types"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

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
    const session = await getServerSession(authOptions)

    let allInspectorIds = data.selectedInspectorIds
    let creatorConnect: { connect: { id: string } } | undefined

    if (session?.user?.email) {
      const inspector = await prisma.inspector.findFirst({
        where: { email: session.user.email },
      })
      if (inspector) {
        creatorConnect = { connect: { id: inspector.id } }
        if (!allInspectorIds.includes(inspector.id)) {
          allInspectorIds = [inspector.id, ...allInspectorIds]
        }
      }
    }

    const audit = await prisma.audit.create({
      data: {
        date: new Date(data.generalDetails.date),
        unitName: data.generalDetails.unitName,
        rabbiName: data.generalDetails.rabbiName,
        rabbiRank: data.generalDetails.rabbiRank,
        rabbiSeniority: data.generalDetails.rabbiSeniority,
        rabbiIdNumber: data.generalDetails.rabbiIdNumber,
        ncoName: data.generalDetails.ncoName,
        ncoRank: data.generalDetails.ncoRank,
        ncoSeniority: data.generalDetails.ncoSeniority,
        ncoIdNumber: data.generalDetails.ncoIdNumber,
        ...(creatorConnect && { creator: creatorConnect }),
        summaryEvaluation: null,
        recommendations: null,
        finalScore: null,
        status: "DRAFT",
        ...(allInspectorIds.length > 0 && {
          inspectors: { connect: allInspectorIds.map((id) => ({ id })) },
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
    revalidatePath("/audits")
    return { success: true, auditId: audit.id }
  } catch (error) {
    console.error("Error saving audit:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function updateAudit(auditId: string, data: SaveAuditParams) {
  try {
    const session = await getServerSession(authOptions)
    let allInspectorIds = data.selectedInspectorIds

    if (session?.user?.email) {
      const inspector = await prisma.inspector.findFirst({
        where: { email: session.user.email },
      })
      if (inspector && !allInspectorIds.includes(inspector.id)) {
        allInspectorIds = [inspector.id, ...allInspectorIds]
      }
    }

    await prisma.audit.update({
      where: { id: auditId },
      data: {
        date: new Date(data.generalDetails.date),
        unitName: data.generalDetails.unitName,
        rabbiName: data.generalDetails.rabbiName,
        rabbiRank: data.generalDetails.rabbiRank,
        rabbiSeniority: data.generalDetails.rabbiSeniority,
        rabbiIdNumber: data.generalDetails.rabbiIdNumber,
        ncoName: data.generalDetails.ncoName,
        ncoRank: data.generalDetails.ncoRank,
        ncoSeniority: data.generalDetails.ncoSeniority,
        ncoIdNumber: data.generalDetails.ncoIdNumber,
        inspectors: { set: allInspectorIds.map((id) => ({ id })) },
      },
    })

    for (const [criterionId, entry] of Object.entries(data.answers)) {
      if (entry.value === undefined && entry.comment === undefined) continue
      await prisma.answer.upsert({
        where: {
          auditId_criterionId: { auditId, criterionId },
        },
        create: {
          auditId,
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
        where: { id: auditId },
        data: {
          summaryEvaluation: byLabel[SUMMARY_LABELS.summaryEvaluation] ?? null,
          recommendations: byLabel[SUMMARY_LABELS.recommendations] ?? null,
          finalScore: byLabel[SUMMARY_LABELS.finalScore] ?? null,
        },
      })
    }

    revalidatePath("/")
    revalidatePath("/audits")
    revalidatePath(`/audit/${auditId}`)
    return { success: true, auditId }
  } catch (error) {
    console.error("Error updating audit:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
