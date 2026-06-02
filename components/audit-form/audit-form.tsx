"use client"

import { useCallback, useEffect, useRef, useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import { AuditHeader } from "./audit-header"
import { AuditTabs } from "./audit-tabs"
import { AuditNavigation } from "./audit-navigation"
import { GeneralDetailsSection } from "./sections/general-details"
import { CriterionField } from "./sections/criterion-field"
import { saveAudit, updateAudit } from "@/app/actions"
import { toggleAuditLock } from "@/app/lib/actions/audit-actions"
import { useOfflineAuditStorage } from "@/app/lib/offline/use-offline-audit"
import { syncOfflineData, type ServerAuditSnapshot } from "@/app/lib/offline/sync-engine"
import { useNavigationGuard } from "@/app/lib/navigation/use-navigation-guard"
import { Button } from "@/components/ui/button"
import { Save, Pencil } from "lucide-react"
import { toast } from "sonner"
import type {
  CategoryWithCriteria,
  GeneralDetails,
  AnswersByCriterionId,
  InspectorOption,
} from "./types"

const log = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") console.log(...args)
}

const NEW_AUDIT_OFFLINE_MESSAGE =
  "אין אינטרנט. לא ניתן ליצור ביקורת חדשה במצב אופליין. יש לחזור לאזור עם קליטה וללחוץ שוב שמור."

function isBrowserOffline() {
  return typeof navigator !== "undefined" && !navigator.onLine
}

function isServerUnreachableMessage(message: string) {
  const lower = message.toLowerCase()
  return (
    lower.includes("can't reach database server") ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("econnrefused") ||
    lower.includes("etimedout") ||
    lower.includes("p1001")
  )
}

function isUnreachableSaveError(message: string) {
  return isBrowserOffline() || isServerUnreachableMessage(message)
}

const GENERAL_TAB_ID = "general"

export interface AuditFormProps {
  categories: CategoryWithCriteria[]
  inspectors: InspectorOption[]
  auditId?: string
  isLocked?: boolean
  initialGeneralDetails?: GeneralDetails
  initialAnswers?: AnswersByCriterionId
  initialSelectedInspectorIds?: string[]
  forceFresh?: boolean
}

const createInitialGeneral = (): GeneralDetails => {
  return {
    date: new Date().toISOString(),
    unitName: "",
    rabbiName: "",
    rabbiRank: "",
    rabbiSeniority: 0,
    rabbiIdNumber: "",
    ncoName: "",
    ncoRank: "",
    ncoSeniority: 0,
    ncoIdNumber: "",
  }
}

export function AuditForm({
  categories,
  inspectors,
  auditId,
  isLocked = false,
  initialGeneralDetails,
  initialAnswers,
  initialSelectedInspectorIds,
  forceFresh = false,
}: AuditFormProps) {
  const router = useRouter()
  const { registerForm } = useNavigationGuard()
  const offline = useOfflineAuditStorage(auditId ?? "")
  const loadRef = useRef(offline.load)
  loadRef.current = offline.load

  const tabs = useMemo(
    () => [
      { id: GENERAL_TAB_ID, label: "פרטים כלליים" },
      ...categories.map((c) => ({ id: c.id, label: c.name })),
    ],
    [categories]
  )

  const [currentTabId, setCurrentTabId] = useState<string>(GENERAL_TAB_ID)
  const [generalDetails, setGeneralDetails] = useState<GeneralDetails>(
    () => initialGeneralDetails ?? createInitialGeneral()
  )
  const [answers, setAnswers] = useState<AnswersByCriterionId>(
    () => initialAnswers ?? {}
  )
  const [selectedInspectorIds, setSelectedInspectorIds] = useState<string[]>(
    () => initialSelectedInspectorIds ?? []
  )
  const [isPending, startTransition] = useTransition()
  const [isDirty, setIsDirty] = useState(false)
  const [syncStatus, setSyncStatus] = useState<"checking" | "synced" | "offline" | "syncing" | "pending" | "error">("checking")
  const readOnly = !!auditId && isLocked
  const answerSaveTimers = useRef<Record<string, number>>({})
  const generalSaveTimer = useRef<number | null>(null)
  const generalRef = useRef<GeneralDetails>(generalDetails)
  const answersRef = useRef<AnswersByCriterionId>(answers)
  const inspectorIdsRef = useRef<string[]>(selectedInspectorIds)
  const isDirtyRef = useRef(false)
  const auditIdRef = useRef(auditId ?? "")
  auditIdRef.current = auditId ?? ""
  const editedGeneralFields = useRef<Set<string>>(new Set())
  const editedCriterionIds = useRef<Set<string>>(new Set())
  const editedInspectors = useRef(false)

  const markDirty = useCallback(() => {
    if (isDirtyRef.current) return
    isDirtyRef.current = true
    setIsDirty(true)
    log("[AuditForm] dirty state changed", { isDirty: true, auditId: auditIdRef.current || "draft" })
  }, [])

  /**
   * מרענן את state הטופס מנתוני השרת: רק תשובות שהשרת חדש מהמקומי (serverAt > localAt),
   * ולא דורס שדה שממוקד כרגע (Focus Guard).
   */
  const applyServerUpdatesToState = useCallback((data: ServerAuditSnapshot) => {
    if (data.id !== auditIdRef.current) return
    const focusedCriterionId =
      (document.activeElement as HTMLElement)?.getAttribute?.("data-criterion-id") ?? null

    setGeneralDetails((prev) => {
      const next = { ...data.generalDetails }
      editedGeneralFields.current.forEach((f) => {
        (next as Record<string, unknown>)[f] = prev[f as keyof GeneralDetails]
      })
      generalRef.current = next
      return next
    })
    setAnswers((prev) => {
      const next = { ...prev }
      for (const serverAnswer of data.answers) {
        if (focusedCriterionId === serverAnswer.criterionId) continue
        const local = prev[serverAnswer.criterionId]
        const localAt = local?.updatedAt ? new Date(local.updatedAt).getTime() : 0
        const serverAt = new Date(serverAnswer.updatedAt).getTime()
        if (serverAt > localAt) {
          next[serverAnswer.criterionId] = {
            value: serverAnswer.value,
            comment: serverAnswer.comment,
            updatedAt: serverAnswer.updatedAt,
          }
        }
      }
      answersRef.current = next
      return next
    })
    if (!editedInspectors.current) {
      setSelectedInspectorIds(data.selectedInspectorIds)
      inspectorIdsRef.current = data.selectedInspectorIds
    }
  }, [])

  const onSyncResponseRef = useRef<(data: ServerAuditSnapshot) => Promise<void>>(null!)
  onSyncResponseRef.current = async (data: ServerAuditSnapshot) => {
    await offline.updateFromSync(data)
    if (data.id === auditIdRef.current) applyServerUpdatesToState(data)
  }

  const onServerUpdate = useCallback((data: ServerAuditSnapshot) => {
    log("[SyncDebug] Form callback received server audit:", data.id, "updatedAt:", data.updatedAt, "answersCount:", data.answers?.length ?? 0, "currentAuditId:", auditIdRef.current)
    return onSyncResponseRef.current?.(data)
  }, [])

  const resetForFresh = useCallback(async () => {
    const emptyGeneral = createInitialGeneral()
    await offline.clearDraft()
    setCurrentTabId(GENERAL_TAB_ID)
    setGeneralDetails(emptyGeneral)
    setAnswers({})
    setSelectedInspectorIds([])
    generalRef.current = emptyGeneral
    answersRef.current = {}
    inspectorIdsRef.current = []
    editedGeneralFields.current.clear()
    editedCriterionIds.current.clear()
    editedInspectors.current = false
    isDirtyRef.current = false
    setIsDirty(false)
    log("[AuditForm] resetForFresh executed")
  }, [offline.clearDraft])

  useEffect(() => {
    const fallbackGeneral = initialGeneralDetails ?? createInitialGeneral()
    const fallbackAnswers = initialAnswers ?? {}
    const fallbackInspectors = initialSelectedInspectorIds ?? []
    if (forceFresh && !auditId) {
      resetForFresh()
      return
    }
    loadRef
      .current(fallbackGeneral, fallbackAnswers, fallbackInspectors)
      .then((state) => {
        if (isDirtyRef.current) return
        setGeneralDetails(state.generalDetails)
        setAnswers(state.answers)
        setSelectedInspectorIds(state.selectedInspectorIds)
        generalRef.current = state.generalDetails
        answersRef.current = state.answers
        inspectorIdsRef.current = state.selectedInspectorIds
        if (state.isDirty) {
          isDirtyRef.current = true
          setIsDirty(true)
          log("[AuditForm] local dirty state restored", { auditId: auditIdRef.current || "draft" })
        }
        if (state.pendingServerSave) {
          setSyncStatus("pending")
          log("[AuditForm] pending server save restored", { auditId: auditIdRef.current || "draft" })
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when auditId changes; initial* read at run time
  }, [auditId, forceFresh, resetForFresh])

  useEffect(() => {
    let cancelled = false
    const SYNC_INTERVAL_MS = 30_000

    const runSync = async () => {
      if (typeof window === "undefined") return
      if (!navigator.onLine) {
        if (!cancelled) setSyncStatus("offline")
        return
      }
      if (!cancelled) setSyncStatus("checking")
      const result = await syncOfflineData(
        onServerUpdate,
        auditId ? [auditId] : [],
        { pushDirty: true },
      )
      if (cancelled) return
      if (result.status === "offline") setSyncStatus("offline")
      else if (result.status === "synced" || result.status === "idle") {
        setSyncStatus("synced")
        if (result.status === "synced" && result.pushedPendingSaves) {
          toast.success("נתונים שנשמרו מקומית שודרו לשרת")
        }
      }
      else setSyncStatus("error")
    }

    runSync()
    const intervalId = window.setInterval?.(runSync, SYNC_INTERVAL_MS) ?? null

    const handleOnline = () => {
      setSyncStatus("syncing")
      runSync()
    }

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline)
    }

    return () => {
      cancelled = true
      if (intervalId != null && window.clearInterval) window.clearInterval(intervalId)
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline)
      }
    }
  }, [onServerUpdate, auditId])

  const currentIndex = tabs.findIndex((t) => t.id === currentTabId)
  const isFirst = currentIndex === 0
  const isLast = currentIndex === tabs.length - 1

  const handlePrevious = () => {
    if (!isFirst) setCurrentTabId(tabs[currentIndex - 1].id)
  }

  const handleNext = () => {
    if (!isLast) setCurrentTabId(tabs[currentIndex + 1].id)
  }

  const scheduleGeneralSave = () => {
    if (readOnly) return
    if (typeof window === "undefined") return
    if (generalSaveTimer.current) {
      window.clearTimeout(generalSaveTimer.current)
    }
    generalSaveTimer.current = window.setTimeout(() => {
      offline.saveGeneralDetails(generalRef.current, inspectorIdsRef.current)
    }, 500)
  }

  const scheduleAnswerSave = (criterionId: string) => {
    if (readOnly) return
    if (typeof window === "undefined") return
    const timers = answerSaveTimers.current
    if (timers[criterionId]) {
      window.clearTimeout(timers[criterionId])
    }
    const handle = window.setTimeout(() => {
      const entry = answersRef.current[criterionId]
      offline.saveAnswer(
        criterionId,
        entry?.value ?? null,
        entry?.comment ?? null,
      )
      delete timers[criterionId]
    }, 500)
    timers[criterionId] = handle
  }

  const updateGeneralDetails = (field: keyof GeneralDetails, value: string | number) => {
    markDirty()
    editedGeneralFields.current.add(field)
    const current = generalRef.current
    const next = { ...current, [field]: value }
    generalRef.current = next
    setGeneralDetails(next)
    scheduleGeneralSave()
  }

  const toggleInspector = (id: string) => {
    markDirty()
    editedInspectors.current = true
    const current = inspectorIdsRef.current
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    inspectorIdsRef.current = next
    setSelectedInspectorIds(next)
    scheduleGeneralSave()
  }

  const updateAnswer = (criterionId: string, value: string | null) => {
    markDirty()
    editedCriterionIds.current.add(criterionId)
    const now = new Date().toISOString()
    const prev = answersRef.current
    const current = prev[criterionId] ?? {}
    const nextEntry = { ...current, value: value ?? null, updatedAt: now }
    const next = { ...prev, [criterionId]: nextEntry }
    answersRef.current = next
    setAnswers(next)
    scheduleAnswerSave(criterionId)
  }

  const updateAnswerComment = (criterionId: string, comment: string) => {
    markDirty()
    editedCriterionIds.current.add(criterionId)
    const now = new Date().toISOString()
    const prev = answersRef.current
    const current = prev[criterionId] ?? {}
    const nextEntry = { ...current, comment: comment || null, updatedAt: now }
    const next = { ...prev, [criterionId]: nextEntry }
    answersRef.current = next
    setAnswers(next)
    scheduleAnswerSave(criterionId)
  }

  useEffect(() => {
    return () => {
      if (generalSaveTimer.current) {
        window.clearTimeout(generalSaveTimer.current)
      }
      Object.values(answerSaveTimers.current).forEach((id) => {
        window.clearTimeout(id)
      })
    }
  }, [])

  const performSave = useCallback(async (redirectOnCreate: boolean) => {
    const payload = {
      generalDetails: generalRef.current,
      answers: answersRef.current,
      selectedInspectorIds: inspectorIdsRef.current,
    }
    log("[AuditForm] save start", { auditId: auditIdRef.current || "draft" })
    if (isBrowserOffline()) {
      if (auditId) {
        await offline.queueServerSave(
          payload.generalDetails,
          payload.selectedInspectorIds,
          payload.answers,
        )
        isDirtyRef.current = false
        setIsDirty(false)
        editedGeneralFields.current.clear()
        editedCriterionIds.current.clear()
        editedInspectors.current = false
        setSyncStatus("pending")
        toast.info("הנתונים נשמרו מקומית וישלחו כשיהיה אינטרנט")
        log("[AuditForm] save queued offline", { auditId })
        return { success: true }
      }

      toast.error(NEW_AUDIT_OFFLINE_MESSAGE)
      log("[AuditForm] save offline draft failed", { error: NEW_AUDIT_OFFLINE_MESSAGE })
      return { success: false, error: NEW_AUDIT_OFFLINE_MESSAGE }
    }

    let result: Awaited<ReturnType<typeof saveAudit>>
    try {
      result = auditId
        ? await updateAudit(auditId, payload)
        : await saveAudit(payload)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown save error"
      if (!auditId && isUnreachableSaveError(message)) {
        toast.error(NEW_AUDIT_OFFLINE_MESSAGE)
        log("[AuditForm] save unreachable for new audit", { error: message })
        return { success: false, error: NEW_AUDIT_OFFLINE_MESSAGE }
      }
      if (auditId && isUnreachableSaveError(message)) {
        await offline.queueServerSave(
          payload.generalDetails,
          payload.selectedInspectorIds,
          payload.answers,
        )
        isDirtyRef.current = false
        setIsDirty(false)
        editedGeneralFields.current.clear()
        editedCriterionIds.current.clear()
        editedInspectors.current = false
        setSyncStatus("pending")
        toast.info("הנתונים נשמרו מקומית וישלחו כשיהיה אינטרנט")
        log("[AuditForm] save queued after unreachable exception", { auditId, error: message })
        return { success: true }
      }
      toast.error(`שגיאה: ${message}`)
      log("[AuditForm] save exception", { error: message })
      return { success: false, error: message }
    }

    if (result.success) {
      isDirtyRef.current = false
      setIsDirty(false)
      editedGeneralFields.current.clear()
      editedCriterionIds.current.clear()
      editedInspectors.current = false
      toast.success(auditId ? "הביקורת עודכנה" : "הביקורת נשמרה בהצלחה")
      log("[AuditForm] save success", { auditId: result.auditId })
      await offline.clearCurrent()
      await offline.clearDraft()
      if (redirectOnCreate && !auditId && "auditId" in result) {
        router.push(`/audit/${result.auditId}`)
      }
      return { success: true }
    }

    const failureMessage = result.error ?? "Unknown save error"
    if (!auditId && isUnreachableSaveError(failureMessage)) {
      toast.error(NEW_AUDIT_OFFLINE_MESSAGE)
      log("[AuditForm] save unreachable for new audit", { error: failureMessage })
      return { success: false, error: NEW_AUDIT_OFFLINE_MESSAGE }
    }
    if (auditId && isUnreachableSaveError(failureMessage)) {
      await offline.queueServerSave(
        payload.generalDetails,
        payload.selectedInspectorIds,
        payload.answers,
      )
      isDirtyRef.current = false
      setIsDirty(false)
      editedGeneralFields.current.clear()
      editedCriterionIds.current.clear()
      editedInspectors.current = false
      setSyncStatus("pending")
      toast.info("הנתונים נשמרו מקומית וישלחו כשיהיה אינטרנט")
      log("[AuditForm] save queued after unreachable failure", { auditId, error: failureMessage })
      return { success: true }
    }
    toast.error(`שגיאה: ${failureMessage}`)
    log("[AuditForm] save failure", { error: failureMessage })
    return { success: false, error: failureMessage }
  }, [auditId, offline.clearCurrent, offline.clearDraft, offline.queueServerSave, router])

  const discardLocal = useCallback(async () => {
    await offline.clearCurrent()
    if (!auditId) {
      await offline.clearDraft()
    }
    isDirtyRef.current = false
    setIsDirty(false)
    log("[AuditForm] discardLocal cleared", { auditId: auditIdRef.current || "draft" })
  }, [auditId, offline.clearCurrent, offline.clearDraft])

  useEffect(() => {
    return registerForm({
      isDirty: () => isDirtyRef.current,
      save: () => performSave(false),
      discardLocal,
      resetForFresh,
    })
  }, [discardLocal, isDirty, performSave, registerForm, resetForFresh])

  const handleSave = () => {
    startTransition(() => {
      void performSave(true)
    })
  }

  const handleUnlockAndEdit = () => {
    if (!auditId) return
    startTransition(() => {
      toggleAuditLock(auditId, true).then(() => router.refresh())
    })
  }

  const currentCategory = currentTabId !== GENERAL_TAB_ID
    ? categories.find((c) => c.id === currentTabId)
    : null

  const renderContent = () => {
    if (currentTabId === GENERAL_TAB_ID) {
      return (
        <GeneralDetailsSection
          data={generalDetails}
          onUpdate={updateGeneralDetails}
          inspectors={inspectors}
          selectedInspectorIds={selectedInspectorIds}
          onInspectorToggle={toggleInspector}
          readOnly={readOnly}
        />
      )
    }

    if (!currentCategory) return null

    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">{currentCategory.name}</h2>
        {currentCategory.criteria.map((criterion) => (
          <CriterionField
            key={criterion.id}
            criterion={criterion}
            value={answers[criterion.id]?.value}
            comment={answers[criterion.id]?.comment}
            onValueChange={(value) => updateAnswer(criterion.id, value)}
            onCommentChange={(comment) => updateAnswerComment(criterion.id, comment)}
            readOnly={readOnly}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AuditHeader />

      <AuditTabs
        tabs={tabs}
        currentTab={currentTabId}
        onTabChange={(id) => setCurrentTabId(id)}
      />

      <main className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-2 text-xs text-muted-foreground">
          {syncStatus === "checking" && "Sync status: Checking..."}
          {syncStatus === "synced" && "Sync status: Synced"}
          {syncStatus === "offline" && "Sync status: Offline - Saved Locally"}
          {syncStatus === "syncing" && "Sync status: Syncing..."}
          {syncStatus === "pending" && "Sync status: Waiting for internet to upload"}
          {syncStatus === "error" && "Sync status: Sync error"}
        </div>
        {renderContent()}
      </main>

      {readOnly ? (
        <footer className="sticky bottom-0 border-t border-border bg-card px-4 py-4 shadow-lg">
          <Button
            onClick={handleUnlockAndEdit}
            disabled={isPending}
            size="lg"
            className="w-full gap-2 text-lg font-bold py-6"
          >
            <Pencil className="size-6" aria-hidden="true" />
            <span>{isPending ? "מעביר לעריכה..." : "ערוך"}</span>
          </Button>
        </footer>
      ) : (
        <AuditNavigation
          onPrevious={handlePrevious}
          onNext={handleNext}
          isFirst={isFirst}
          isLast={isLast}
          currentStep={currentIndex + 1}
          totalSteps={tabs.length}
          rightAction={
            <Button
              onClick={handleSave}
              disabled={isPending}
              className="gap-2 text-base font-medium"
              size="lg"
              variant="outline"
            >
              <Save className="size-5" aria-hidden="true" />
              <span>{isPending ? "שומר..." : "שמור"}</span>
            </Button>
          }
        />
      )}
    </div>
  )
}
