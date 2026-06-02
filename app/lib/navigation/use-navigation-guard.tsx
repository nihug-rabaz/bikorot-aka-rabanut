"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import { navLog } from "./log"

type NavigationTrigger = "sidebar" | "back" | "url" | "new-audit" | "beforeunload" | "signout"

type SaveResult = {
  success: boolean
  error?: string
}

type RegisteredForm = {
  isDirty: () => boolean
  save: () => Promise<SaveResult>
  discardLocal: () => Promise<void>
  resetForFresh: () => Promise<void>
}

type NavigationGuardContextValue = {
  isModalOpen: boolean
  isSaving: boolean
  pendingTarget: string | null
  registerForm: (form: RegisteredForm) => () => void
  requestNavigation: (target: string, options?: { trigger?: NavigationTrigger }) => void
  requestAction: (action: () => Promise<void> | void, options?: { trigger?: NavigationTrigger; label?: string }) => void
  confirmDiscardAndContinue: () => Promise<void>
  confirmSaveAndContinue: () => Promise<void>
  cancelNavigation: () => void
}

const NavigationGuardContext = createContext<NavigationGuardContextValue | null>(null)

function withFreshIntent(target: string) {
  if (target !== "/") return target
  return `/?fresh=${Date.now()}`
}

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [pendingTarget, setPendingTarget] = useState<string | null>(null)
  const [pendingTrigger, setPendingTrigger] = useState<NavigationTrigger>("sidebar")
  const formRef = useRef<RegisteredForm | null>(null)
  const pendingActionRef = useRef<(() => Promise<void> | void) | null>(null)
  const currentUrlRef = useRef("/")
  const isSavingRef = useRef(false)

  useEffect(() => {
    currentUrlRef.current = `${window.location.pathname}${window.location.search}${window.location.hash}`
  }, [pathname])

  useEffect(() => {
    isSavingRef.current = isSaving
  }, [isSaving])

  useEffect(() => {
    navLog("NavGuard", "provider mounted")
  }, [])

  const navigateTo = useCallback(
    (target: string, trigger: NavigationTrigger) => {
      const route = trigger === "new-audit" ? withFreshIntent(target) : target
      navLog("NavGuard", "navigate", { route, trigger })
      router.push(route)
    },
    [router],
  )

  const registerForm = useCallback((form: RegisteredForm) => {
    formRef.current = form
    navLog("NavGuard", "form registered")
    return () => {
      if (formRef.current === form) {
        formRef.current = null
        navLog("NavGuard", "form unregistered")
      }
    }
  }, [])

  const requestNavigation = useCallback(
    (target: string, options?: { trigger?: NavigationTrigger }) => {
      const trigger = options?.trigger ?? "sidebar"
      const form = formRef.current
      const isDirty = form?.isDirty() ?? false

      if (isSavingRef.current) {
        navLog("NavGuard", "request blocked while saving", {
          target,
          trigger,
          isDirty,
          isSaving: true,
        })
        return
      }

      navLog("NavGuard", "request navigation", {
        target,
        trigger,
        isDirty,
        isSaving: false,
      })

      if (!form) {
        navigateTo(target, trigger)
        return
      }

      const targetIsCurrent = target === pathname && trigger !== "new-audit"
      if (targetIsCurrent) {
        navLog("NavGuard", "request ignored for current route", { target, trigger })
        return
      }

      if (!isDirty) {
        if (trigger === "new-audit") {
          form.resetForFresh().catch((error) => {
            navLog("NavGuard", "fresh reset failed", {
              error: error instanceof Error ? error.message : String(error),
            })
          })
        }
        navigateTo(target, trigger)
        return
      }

      setPendingTarget(target)
      setPendingTrigger(trigger)
      pendingActionRef.current = null
      setIsModalOpen(true)
      navLog("NavGuard", "opening unsaved changes modal", { target, trigger })
    },
    [navigateTo, pathname],
  )

  const requestAction = useCallback(
    (action: () => Promise<void> | void, options?: { trigger?: NavigationTrigger; label?: string }) => {
      const trigger = options?.trigger ?? "sidebar"
      const label = options?.label ?? "action"
      const form = formRef.current
      const isDirty = form?.isDirty() ?? false

      if (isSavingRef.current) {
        navLog("NavGuard", "action blocked while saving", { label, trigger, isDirty })
        return
      }

      navLog("NavGuard", "request action", { label, trigger, isDirty })
      if (!form || !isDirty) {
        void action()
        return
      }

      pendingActionRef.current = action
      setPendingTarget(label)
      setPendingTrigger(trigger)
      setIsModalOpen(true)
      navLog("NavGuard", "opening unsaved changes modal for action", { label, trigger })
    },
    [],
  )

  const cancelNavigation = useCallback(() => {
    navLog("NavGuard", "navigation cancelled", { target: pendingTarget })
    pendingActionRef.current = null
    setPendingTarget(null)
    setIsModalOpen(false)
  }, [pendingTarget])

  const confirmDiscardAndContinue = useCallback(async () => {
    const target = pendingTarget
    const form = formRef.current
    if (!target || !form || isSavingRef.current) return

    isSavingRef.current = true
    setIsSaving(true)
    try {
      navLog("NavGuard", "discard and continue started", { target, trigger: pendingTrigger })
      await form.discardLocal()
      if (pendingTrigger === "new-audit") {
        await form.resetForFresh()
      }
      const pendingAction = pendingActionRef.current
      setIsModalOpen(false)
      setPendingTarget(null)
      pendingActionRef.current = null
      if (pendingAction) {
        await pendingAction()
      } else {
        navigateTo(target, pendingTrigger)
      }
      navLog("NavGuard", "discard and continue completed", { target, trigger: pendingTrigger })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown discard error"
      toast.error(`שגיאה בניקוי נתונים מקומיים: ${message}`)
      navLog("NavGuard", "discard and continue failed", { target, error: message })
    } finally {
      isSavingRef.current = false
      setIsSaving(false)
    }
  }, [navigateTo, pendingTarget, pendingTrigger])

  const confirmSaveAndContinue = useCallback(async () => {
    const target = pendingTarget
    const form = formRef.current
    if (!target || !form || isSavingRef.current) return

    isSavingRef.current = true
    setIsSaving(true)
    try {
      navLog("NavGuard", "save and continue started", { target, trigger: pendingTrigger })
      const result = await form.save()
      if (!result.success) {
        const message = result.error ?? "Unknown save error"
        toast.error(`שמירה נכשלה: ${message}`)
        navLog("NavGuard", "save and continue failed", { target, error: message })
        return
      }
      if (pendingTrigger === "new-audit") {
        await form.resetForFresh()
      }
      const pendingAction = pendingActionRef.current
      setIsModalOpen(false)
      setPendingTarget(null)
      pendingActionRef.current = null
      if (pendingAction) {
        await pendingAction()
      } else {
        navigateTo(target, pendingTrigger)
      }
      navLog("NavGuard", "save and continue completed", { target, trigger: pendingTrigger })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown save error"
      toast.error(`שמירה נכשלה: ${message}`)
      navLog("NavGuard", "save and continue threw", { target, error: message })
    } finally {
      isSavingRef.current = false
      setIsSaving(false)
    }
  }, [navigateTo, pendingTarget, pendingTrigger])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const isDirty = formRef.current?.isDirty() ?? false
      if (!isDirty || isSavingRef.current) return
      navLog("NavGuard", "beforeunload warned")
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [])

  useEffect(() => {
    window.history.replaceState({ navGuard: true }, "", window.location.href)

    const handlePopState = () => {
      const isDirty = formRef.current?.isDirty() ?? false
      if (!isDirty || isSavingRef.current) {
        currentUrlRef.current = `${window.location.pathname}${window.location.search}${window.location.hash}`
        return
      }

      const target = `${window.location.pathname}${window.location.search}${window.location.hash}`
      window.history.pushState({ navGuard: true }, "", currentUrlRef.current)
      navLog("NavGuard", "back intercepted", { target })
      requestNavigation(target, { trigger: "back" })
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [requestNavigation])

  const value = useMemo(
    () => ({
      isModalOpen,
      isSaving,
      pendingTarget,
      registerForm,
      requestNavigation,
      requestAction,
      confirmDiscardAndContinue,
      confirmSaveAndContinue,
      cancelNavigation,
    }),
    [
      cancelNavigation,
      confirmDiscardAndContinue,
      confirmSaveAndContinue,
      isModalOpen,
      isSaving,
      pendingTarget,
      registerForm,
      requestAction,
      requestNavigation,
    ],
  )

  return (
    <NavigationGuardContext.Provider value={value}>
      {children}
    </NavigationGuardContext.Provider>
  )
}

export function useNavigationGuard() {
  const context = useContext(NavigationGuardContext)
  if (!context) {
    throw new Error("useNavigationGuard must be used within NavigationGuardProvider")
  }
  return context
}
