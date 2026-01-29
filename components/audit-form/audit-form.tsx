"use client"

import { useState, useTransition, useMemo } from "react"
import { AuditHeader } from "./audit-header"
import { AuditTabs } from "./audit-tabs"
import { AuditNavigation } from "./audit-navigation"
import { GeneralDetailsSection } from "./sections/general-details"
import { CriterionField } from "./sections/criterion-field"
import { saveAudit } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Save } from "lucide-react"
import { toast } from "sonner"
import type {
  CategoryWithCriteria,
  GeneralDetails,
  AnswersByCriterionId,
  InspectorOption,
} from "./types"

const GENERAL_TAB_ID = "general"

export interface AuditFormProps {
  categories: CategoryWithCriteria[]
  inspectors: InspectorOption[]
}

function getInitialGeneralDetails(): GeneralDetails {
  return {
    unitName: "",
    rabbiName: "",
    rabbiSeniority: 0,
    rabbiIdNumber: "",
    ncoName: "",
    ncoSeniority: 0,
    ncoIdNumber: "",
  }
}

export function AuditForm({ categories, inspectors }: AuditFormProps) {
  const tabs = useMemo(
    () => [
      { id: GENERAL_TAB_ID, label: "פרטים כלליים" },
      ...categories.map((c) => ({ id: c.id, label: c.name })),
    ],
    [categories]
  )

  const [currentTabId, setCurrentTabId] = useState<string>(GENERAL_TAB_ID)
  const [generalDetails, setGeneralDetails] = useState<GeneralDetails>(getInitialGeneralDetails())
  const [answers, setAnswers] = useState<AnswersByCriterionId>({})
  const [selectedInspectorIds, setSelectedInspectorIds] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const inspectorName = "דוד כהן"

  const currentIndex = tabs.findIndex((t) => t.id === currentTabId)
  const isFirst = currentIndex === 0
  const isLast = currentIndex === tabs.length - 1

  const handlePrevious = () => {
    if (!isFirst) setCurrentTabId(tabs[currentIndex - 1].id)
  }

  const handleNext = () => {
    if (!isLast) setCurrentTabId(tabs[currentIndex + 1].id)
  }

  const updateGeneralDetails = (field: keyof GeneralDetails, value: string | number) => {
    setGeneralDetails((prev) => ({ ...prev, [field]: value }))
  }

  const toggleInspector = (id: string) => {
    setSelectedInspectorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const updateAnswer = (criterionId: string, value: string | null) => {
    setAnswers((prev) => ({
      ...prev,
      [criterionId]: { ...prev[criterionId], value: value ?? null },
    }))
  }

  const updateAnswerComment = (criterionId: string, comment: string) => {
    setAnswers((prev) => ({
      ...prev,
      [criterionId]: { ...prev[criterionId], comment: comment || null },
    }))
  }

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveAudit({ generalDetails, answers, selectedInspectorIds })

      if (result.success) {
        toast.success("הביקורת נשמרה בהצלחה")
      } else {
        toast.error(`שגיאה בשמירה: ${result.error}`)
      }
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
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <AuditHeader inspectorName={inspectorName} />

      <AuditTabs
        tabs={tabs}
        currentTab={currentTabId}
        onTabChange={(id) => setCurrentTabId(id)}
      />

      <main className="flex-1 overflow-y-auto px-4 py-4">
        {renderContent()}
      </main>

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
    </div>
  )
}
