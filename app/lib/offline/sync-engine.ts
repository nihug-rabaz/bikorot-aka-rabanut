"use client"

import { offlineDb } from "./db"
import type { GeneralDetails } from "@/components/audit-form/types"

const log = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") console.log(...args)
}
const logError = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") console.error(...args)
}

/** ביקורת לשליחה לשרת – כוללת lastUpdated להשוואת גרסאות */
interface SyncPayloadAudit {
  id: string
  generalDetails: GeneralDetails
  selectedInspectorIds: string[]
  lastUpdated: string
}

/** תשובה (קריטריון בודד) לשליחה לשרת */
interface SyncPayloadAnswer {
  auditId: string
  criterionId: string
  value: string | null
  comment: string | null
  lastUpdated: string
}

/** צילום מצב ביקורת כפי שהשרת מחזיר – לשימוש ב-updateFromSync */
export interface ServerAuditSnapshot {
  id: string
  updatedAt: string
  generalDetails: GeneralDetails
  selectedInspectorIds: string[]
  answers: Array<{ criterionId: string; value: string | null; comment: string | null; updatedAt: string }>
}

export type SyncStatusResult =
  | { status: "offline" }
  | { status: "idle" }
  | { status: "synced" }
  | { status: "error" }

/**
 * שולח לשרת רק רשומות עם isDirty=1, ומקבל בחזרה את מצב הביקורות.
 * אם אין dirty אבל יש requestedAuditIds – עדיין שולח בקשת pull לקבלת עדכונים.
 */
export async function syncOfflineData(
  onAuditFromServer?: (data: ServerAuditSnapshot) => void | Promise<void>,
  requestedAuditIds?: string[]
): Promise<SyncStatusResult> {
  if (typeof window === "undefined") return { status: "idle" }
  if (!navigator.onLine) return { status: "offline" }

  const dirtyAudits = await offlineDb.audits.where("isDirty").equals(1).toArray()
  const dirtyAnswers = await offlineDb.answers.where("isDirty").equals(1).toArray()
  const hasDirty = dirtyAudits.length > 0 || dirtyAnswers.length > 0
  const hasPull = requestedAuditIds?.length ? requestedAuditIds.filter((id) => id && id !== "draft").length > 0 : false

  if (!hasDirty && !hasPull) {
    log("[SyncDebug] No dirty data and no requestedAuditIds — returning idle")
    return { status: "idle" }
  }

  const auditsPayload = dirtyAudits
    .filter((a) => a.id && a.id !== "draft")
    .map((a) => ({
      id: a.id,
      generalDetails: JSON.parse(a.generalDetailsJson),
      selectedInspectorIds: JSON.parse(a.selectedInspectorIdsJson),
      lastUpdated: a.updatedAt,
    }))

  const answersPayload = dirtyAnswers
    .filter((a) => a.auditId && a.auditId !== "draft")
    .map((a) => ({
      auditId: a.auditId,
      criterionId: a.criterionId,
      value: a.value,
      comment: a.comment,
      lastUpdated: a.updatedAt,
    }))

  const pullIds = hasPull ? (requestedAuditIds ?? []).filter((id) => id && id !== "draft") : []

  try {
    log(`[SyncEngine] Sending ${auditsPayload.length} audits, ${answersPayload.length} answers, requestedAuditIds: ${pullIds.length}`)

    const res = await fetch("/api/offline-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audits: auditsPayload,
        answers: answersPayload,
        ...(pullIds.length > 0 && { requestedAuditIds: pullIds }),
      }),
    })

    if (!res.ok) throw new Error("Server responded with error");

    const json = await res.json() as { ok: boolean; audits: ServerAuditSnapshot[] };

    if (json.audits?.length && onAuditFromServer) {
      log("[SyncDebug] onAuditFromServer called with", json.audits.length, "audit(s)")
      for (const audit of json.audits) {
        log("[SyncDebug] Invoking onAuditFromServer for audit:", audit.id, "updatedAt:", audit.updatedAt, "answers:", audit.answers?.length ?? 0)
        await onAuditFromServer(audit)
      }
    } else {
      log("[SyncDebug] Response handling: no callback or no audits. audits?.length:", json.audits?.length, "hasCallback:", !!onAuditFromServer)
    }

    const now = new Date().toISOString()
    await offlineDb.transaction("rw", offlineDb.audits, offlineDb.answers, async () => {
      /** מסמנים isDirty=0 רק אם הערך לא השתנה מאז השליחה (מנע דריסה של עריכה מקומית) */
      for (const sentAudit of auditsPayload) {
        const currentInDb = await offlineDb.audits.get(sentAudit.id);
        if (currentInDb && currentInDb.updatedAt === sentAudit.lastUpdated) {
          await offlineDb.audits.update(sentAudit.id, { isDirty: 0, lastSyncedAt: now });
        }
      }

      for (const sentAnswer of dirtyAnswers) {
        const currentInDb = await offlineDb.answers.get(sentAnswer.id);
        if (currentInDb && currentInDb.updatedAt === sentAnswer.updatedAt) {
          await offlineDb.answers.update(sentAnswer.id, { isDirty: 0, lastSyncedAt: now });
        }
      }
    });

    log("[SyncEngine] Sync completed successfully")
    return { status: "synced" }
  } catch (err) {
    logError("[SyncEngine] Sync failed:", err)
    return { status: "error" }
  }
}
