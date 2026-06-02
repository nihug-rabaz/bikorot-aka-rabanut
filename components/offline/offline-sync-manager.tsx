"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { syncOfflineData } from "@/app/lib/offline/sync-engine"

const log = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") console.log(...args)
}

export function OfflineSyncManager() {
  useEffect(() => {
    let cancelled = false
    const SYNC_INTERVAL_MS = 30_000

    const runPendingSync = async () => {
      if (typeof window === "undefined" || !navigator.onLine) return
      const result = await syncOfflineData(undefined, [], { pushDirty: true })
      if (cancelled) return
      if (result.status === "synced" && result.pushedPendingSaves) {
        toast.success("נתונים שנשמרו מקומית שודרו לשרת")
        log("[OfflineSyncManager] pending saves pushed")
      }
    }

    runPendingSync()
    const intervalId = window.setInterval(runPendingSync, SYNC_INTERVAL_MS)
    window.addEventListener("online", runPendingSync)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener("online", runPendingSync)
    }
  }, [])

  return null
}
