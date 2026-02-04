"use client"

import { ChevronRight, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ReactNode } from "react"

interface AuditNavigationProps {
  onPrevious: () => void
  onNext: () => void
  isFirst: boolean
  isLast: boolean
  currentStep: number
  totalSteps: number
  rightAction?: ReactNode
}

export function AuditNavigation({
  onPrevious,
  onNext,
  isFirst,
  isLast,
  currentStep,
  totalSteps,
  rightAction,
}: AuditNavigationProps) {
  return (
    <footer className="sticky bottom-0 border-t border-border bg-card px-4 py-3 shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={onPrevious}
          disabled={isFirst}
          className="flex-1 gap-2 text-base font-medium bg-transparent"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
          <span>הקודם</span>
        </Button>

        <div className="flex items-center justify-center gap-1 font-bold text-sm text-foreground" dir="ltr">
          <span className="tabular-nums">{currentStep}</span>
          <span className="text-muted-foreground/40 font-normal">/</span>
          <span className="tabular-nums">{totalSteps}</span>
        </div>

        <div className="flex items-center gap-2 flex-1">
          <Button
            variant={isLast ? "default" : "default"}
            size="lg"
            onClick={onNext}
            disabled={isLast}
            className="flex-1 gap-2 text-base font-medium"
          >
            <span>{isLast ? "סיום" : "הבא"}</span>
            <ChevronLeft className="size-5" aria-hidden="true" />
          </Button>
          {rightAction}
        </div>
      </div>
    </footer>
  )
}
