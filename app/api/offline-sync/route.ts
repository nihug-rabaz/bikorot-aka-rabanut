import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { GeneralDetails } from "@/components/audit-form/types"

const log = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") console.log(...args)
}
const logError = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") console.error(...args)
}

/**
 * מבנה ביקורת נכנסת מהלקוח – פרטים כלליים + תאריך עדכון אחרון לצורך השוואת גרסאות.
 */
interface IncomingAudit {
  id?: string
  generalDetails?: GeneralDetails
  selectedInspectorIds?: string[]
  lastUpdated?: string
}

/**
 * מבנה תשובה נכנסת (קריטריון בודד) – מזהה ביקורת, מזהה קריטריון, ערך והערה + תאריך עדכון.
 */
interface IncomingAnswer {
  auditId?: string
  criterionId?: string
  value?: string | null
  comment?: string | null
  lastUpdated?: string
}

/**
 * נקודת הכניסה לסנכרון אופליין.
 * מקבלת מהלקוח רשימת ביקורות ותשובות (עם lastUpdated), ומחזירה את מצב השרת המעודכן.
 * לוגיקת סנכרון: השוואת תאריכי updatedAt – מעדכן במסד רק כאשר הנתונים הנכנסים חדשים יותר
 * או שווים (Last-Write-Wins). טרנזקציית Prisma מוארכת ל-20 שניות כדי לאפשר עיבוד
 * עשרות תשובות בלי timeout (P2028).
 */
export async function POST(req: Request) {
  const startTime = Date.now()
  try {
    const body = (await req.json()) as {
      audits?: IncomingAudit[]
      answers?: IncomingAnswer[]
      requestedAuditIds?: string[]
    }
    const audits = body.audits ?? []
    const answers = body.answers ?? []
    const requestedAuditIds = body.requestedAuditIds ?? []

    log(`[Sync] Starting sync for ${audits.length} audits and ${answers.length} answers, requestedAuditIds: ${requestedAuditIds.length}`)

    const result = await prisma.$transaction(
      async (tx) => {
        const changedAuditIds = new Set<string>()

        /** שלב 1: עדכון ביקורות – רק אם lastUpdated נכנס חדש או שווה לשרת */
        for (const audit of audits) {
          if (!audit.id || audit.id === "draft") continue

          const existing = await tx.audit.findUnique({
            where: { id: audit.id },
            select: { updatedAt: true },
          })

          const incomingAt = audit.lastUpdated ? new Date(audit.lastUpdated).getTime() : 0
          if (existing && incomingAt > 0 && existing.updatedAt.getTime() > incomingAt) continue

          const updateData: any = {}
          if (audit.generalDetails) {
            const g = audit.generalDetails
            if (g.date) updateData.date = new Date(g.date)
            if (g.unitName !== undefined) updateData.unitName = g.unitName
            if (g.rabbiName !== undefined) updateData.rabbiName = g.rabbiName
            if (g.rabbiRank !== undefined) updateData.rabbiRank = g.rabbiRank
            if (g.rabbiSeniority !== undefined) updateData.rabbiSeniority = g.rabbiSeniority
            if (g.rabbiIdNumber !== undefined) updateData.rabbiIdNumber = g.rabbiIdNumber
            if (g.ncoName !== undefined) updateData.ncoName = g.ncoName
            if (g.ncoRank !== undefined) updateData.ncoRank = g.ncoRank
            if (g.ncoSeniority !== undefined) updateData.ncoSeniority = g.ncoSeniority
            if (g.ncoIdNumber !== undefined) updateData.ncoIdNumber = g.ncoIdNumber
          }

          if (audit.selectedInspectorIds) {
            updateData.inspectors = {
              set: audit.selectedInspectorIds.map((id) => ({ id })),
            }
          }

          if (Object.keys(updateData).length > 0) {
            await tx.audit.update({
              where: { id: audit.id },
              data: updateData
            })
            changedAuditIds.add(audit.id)
          }
        }

        /**
         * שלב 2: תשובות – שליפה אחת של כל התשובות הרלוונטיות, השוואת תאריכים,
         * ו-upsert רק כאשר הנתונים הנכנסים חדשים יותר (או שאין רשומה).
         */
        const validAnswers = answers.filter(
          (a): a is IncomingAnswer & { auditId: string; criterionId: string } =>
            !!a.auditId && a.auditId !== "draft" && !!a.criterionId
        )
        if (validAnswers.length > 0) {
          const existingAnswers = await tx.answer.findMany({
            where: {
              OR: validAnswers.map((a) => ({
                auditId: a.auditId,
                criterionId: a.criterionId,
              })),
            },
            select: { auditId: true, criterionId: true, updatedAt: true },
          })
          const existingByKey = new Map<string, Date>()
          for (const row of existingAnswers) {
            existingByKey.set(`${row.auditId}:${row.criterionId}`, row.updatedAt)
          }
          for (const a of validAnswers) {
            const key = `${a.auditId}:${a.criterionId}`
            const existingAt = existingByKey.get(key)?.getTime() ?? 0
            const incomingAt = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0
            if (existingAt > 0 && incomingAt > 0 && existingAt > incomingAt) continue

            await tx.answer.upsert({
              where: { auditId_criterionId: { auditId: a.auditId, criterionId: a.criterionId } },
              create: {
                auditId: a.auditId,
                criterionId: a.criterionId,
                value: a.value ?? null,
                comment: a.comment ?? null,
              },
              update: {
                value: a.value ?? null,
                comment: a.comment ?? null,
              },
            })
            changedAuditIds.add(a.auditId)
          }
        }

        /** שלב 3: עדכון שדות סיכום בביקורת (הערכת מבקר, המלצות, ציון) לפי קטגוריית "סיכום" */
        if (changedAuditIds.size > 0) {
          const summaryCategory = await tx.category.findFirst({
            where: { name: "סיכום" },
            include: { criteria: true },
          })

          if (summaryCategory) {
            const SUMMARY_MAP: Record<string, string> = {
              "הערכת מבקר": "summaryEvaluation",
              "המלצות מבקר": "recommendations",
              "ציון": "finalScore",
            }

            for (const auditId of changedAuditIds) {
              const auditAnswers = await tx.answer.findMany({
                where: {
                  auditId,
                  criterionId: { in: summaryCategory.criteria.map((c) => c.id) },
                },
                include: { criterion: true },
              })

              const summaryUpdate: any = {}
              auditAnswers.forEach((ans) => {
                const field = SUMMARY_MAP[ans.criterion.label]
                if (field) summaryUpdate[field] = ans.value
              })

              if (Object.keys(summaryUpdate).length > 0) {
                await tx.audit.update({
                  where: { id: auditId },
                  data: summaryUpdate,
                })
              }
            }
          }
        }

        /** איסוף כל המזהים להחזרה: ביקורות שהשתנו + ביקורות שהלקוח ביקש (pull) */
        const idsToReturn = new Set<string>([
          ...changedAuditIds,
          ...requestedAuditIds.filter((id) => id && id !== "draft"),
        ])
        const finalPayload = []
        for (const aid of idsToReturn) {
          const fullAudit = await tx.audit.findUnique({
            where: { id: aid },
            include: {
              inspectors: { select: { id: true } },
              answers: { select: { criterionId: true, value: true, comment: true, updatedAt: true } },
            },
          })

          if (fullAudit) {
            finalPayload.push({
              id: fullAudit.id,
              updatedAt: fullAudit.updatedAt.toISOString(),
              generalDetails: {
                date: fullAudit.date.toISOString(),
                unitName: fullAudit.unitName,
                rabbiName: fullAudit.rabbiName,
                rabbiRank: fullAudit.rabbiRank,
                rabbiSeniority: fullAudit.rabbiSeniority,
                rabbiIdNumber: fullAudit.rabbiIdNumber,
                ncoName: fullAudit.ncoName,
                ncoRank: fullAudit.ncoRank,
                ncoSeniority: fullAudit.ncoSeniority,
                ncoIdNumber: fullAudit.ncoIdNumber,
              },
              selectedInspectorIds: fullAudit.inspectors.map((i) => i.id),
              answers: fullAudit.answers.map((ans) => ({
                ...ans,
                updatedAt: ans.updatedAt.toISOString(),
              })),
            })
          }
        }

        return finalPayload
      },
      { timeout: 20000 }
    )

    log(`[Sync] Success! Execution time: ${Date.now() - startTime}ms`)
    return NextResponse.json({ ok: true, audits: result })
  } catch (error) {
    logError("[Sync] Critical Error:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}