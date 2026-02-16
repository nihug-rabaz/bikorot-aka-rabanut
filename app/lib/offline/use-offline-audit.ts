"use client"

import { useCallback } from "react"
import type { GeneralDetails, AnswersByCriterionId } from "@/components/audit-form/types"
import type { ServerAuditSnapshot } from "./sync-engine"
import { offlineDb } from "./db"

const log = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") console.log(...args)
}

export interface OfflineAuditState {
  generalDetails: GeneralDetails
  answers: AnswersByCriterionId
  selectedInspectorIds: string[]
}

/** המרת פרטים כלליים ל-JSON לשמירה ב-Dexie */
function serializeGeneralDetails(data: GeneralDetails) {
  return JSON.stringify(data)
}

/** שחזור פרטים כלליים מ-JSON; בכשלון מחזיר fallback */
function deserializeGeneralDetails(raw: string | null, fallback: GeneralDetails) {
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw) as GeneralDetails
    return parsed
  } catch {
    return fallback
  }
}

/** המרת רשימת מזהי מפקחים ל-JSON */
function serializeInspectorIds(ids: string[]) {
  return JSON.stringify(ids)
}

/** שחזור רשימת מזהי מפקחים מ-JSON */
function deserializeInspectorIds(raw: string | null) {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * הוק לאחסון וטעינה של ביקורת ב-IndexedDB (Dexie) וסנכרון עם השרת.
 * מחזיר load, saveGeneralDetails, saveInspectors, saveAnswer, updateFromSync.
 */
export function useOfflineAuditStorage(auditKey: string) {
  const effectiveKey = auditKey || "draft"

  /** טוען ביקורת מ-Dexie; אם אין – מחזיר את ערכי ה-fallback */
  const load = useCallback(
    async (
      fallbackGeneral: GeneralDetails,
      fallbackAnswers: AnswersByCriterionId,
      fallbackInspectorIds: string[],
    ): Promise<OfflineAuditState> => {
      const audit = await offlineDb.audits.get(effectiveKey)
      if (!audit) {
        return {
          generalDetails: fallbackGeneral,
          answers: fallbackAnswers,
          selectedInspectorIds: fallbackInspectorIds,
        }
      }

      const generalDetails = deserializeGeneralDetails(
        audit.generalDetailsJson,
        fallbackGeneral,
      )
      const selectedInspectorIds = deserializeInspectorIds(
        audit.selectedInspectorIdsJson,
      )

      const answerRows = await offlineDb.answers
        .where("auditId")
        .equals(effectiveKey)
        .toArray()

      const answers: AnswersByCriterionId = { ...fallbackAnswers }
      for (const row of answerRows) {
        answers[row.criterionId] = {
          value: row.value ?? null,
          comment: row.comment ?? null,
          updatedAt: row.updatedAt,
        }
      }

      return {
        generalDetails,
        answers,
        selectedInspectorIds,
      }
    },
    [effectiveKey],
  )

  /** שומר פרטים כלליים ומפקחים; מסמן isDirty=1 כדי שיישלח בסנכרון */
  const saveGeneralDetails = useCallback(
    async (general: GeneralDetails, selectedInspectorIds: string[]) => {
      const now = new Date().toISOString()
      await offlineDb.audits.put({
        id: effectiveKey,
        generalDetailsJson: serializeGeneralDetails(general),
        selectedInspectorIdsJson: serializeInspectorIds(selectedInspectorIds),
        updatedAt: now,
        isDirty: 1,
        lastSyncedAt: null,
      })
    },
    [effectiveKey],
  )

  /** שומר רשימת מפקחים ומסמן את הביקורת כ-dirty */
  const saveInspectors = useCallback(
    async (selectedInspectorIds: string[], currentGeneral: GeneralDetails) => {
      const now = new Date().toISOString()
      await offlineDb.audits.put({
        id: effectiveKey,
        generalDetailsJson: serializeGeneralDetails(currentGeneral),
        selectedInspectorIdsJson: serializeInspectorIds(selectedInspectorIds),
        updatedAt: now,
        isDirty: 1,
        lastSyncedAt: null,
      })
    },
    [effectiveKey],
  )

  /** שומר תשובה לקריטריון; isDirty=1 כדי לשלוח בסנכרון */
  const saveAnswer = useCallback(
    async (
      criterionId: string,
      value: string | null,
      comment: string | null,
    ) => {
      const now = new Date().toISOString()
      const id = `${effectiveKey}:${criterionId}`
      await offlineDb.answers.put({
        id,
        auditId: effectiveKey,
        criterionId,
        value,
        comment,
        updatedAt: now,
        isDirty: 1,
        lastSyncedAt: null,
      })
    },
    [effectiveKey],
  )

  /**
   * מעדכן את IndexedDB מנתוני השרת שהתקבלו אחרי סנכרון.
   * לוגיקת השוואת תאריכים: מעדכן ביקורת/תשובה רק כאשר updatedAt של השרת >= מקומי (Last-Write-Wins).
   */
  const updateFromSync = useCallback(async (data: ServerAuditSnapshot): Promise<void> => {
    const auditId = data.id
    const serverAuditAt = new Date(data.updatedAt).getTime()
    const now = new Date().toISOString()

    await offlineDb.transaction("rw", offlineDb.audits, offlineDb.answers, async () => {
      const local = await offlineDb.audits.get(auditId)
      const localAt = local?.updatedAt ? new Date(local.updatedAt).getTime() : 0
      log("[SyncDebug] Audit ID:", auditId, "Local updatedAt:", localAt, "Server updatedAt:", serverAuditAt)
      if (!local || serverAuditAt >= localAt) {
        await offlineDb.audits.put({
          id: auditId,
          generalDetailsJson: serializeGeneralDetails(data.generalDetails),
          selectedInspectorIdsJson: serializeInspectorIds(data.selectedInspectorIds),
          updatedAt: data.updatedAt,
          isDirty: 0,
          lastSyncedAt: now,
        })
      }

      for (const ans of data.answers) {
        const id = `${auditId}:${ans.criterionId}`
        const existing = await offlineDb.answers.get(id)
        const serverAnsAt = new Date(ans.updatedAt).getTime()
        const existingAt = existing?.updatedAt ? new Date(existing.updatedAt).getTime() : 0
        log("[SyncDebug] Answer ID:", id, "Local updatedAt:", existingAt, "Server updatedAt:", serverAnsAt)
        if (!existing || serverAnsAt >= existingAt) {
          await offlineDb.answers.put({
            id,
            auditId,
            criterionId: ans.criterionId,
            value: ans.value,
            comment: ans.comment,
            updatedAt: ans.updatedAt,
            isDirty: 0,
            lastSyncedAt: now,
          })
        }
      }
    })
  }, [])

  return {
    load,
    saveGeneralDetails,
    saveInspectors,
    saveAnswer,
    updateFromSync,
  }
}

