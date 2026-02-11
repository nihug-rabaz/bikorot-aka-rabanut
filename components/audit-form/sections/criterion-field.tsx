"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { CheckCircle2, XCircle, MinusCircle, AlertCircle } from "lucide-react"
import type { AuditStatus, ScoreValue } from "../types"
import type { CriterionFromDb } from "../types"

const radioOptions: Array<{
  value: AuditStatus
  label: string
  icon: typeof CheckCircle2
  className: string
  activeClassName: string
}> = [
  {
    value: "תקין",
    label: "תקין",
    icon: CheckCircle2,
    className: "border-success/30 text-success hover:bg-success/10",
    activeClassName: "bg-success text-success-foreground border-success hover:bg-success/90",
  },
  {
    value: "לא תקין",
    label: "לא תקין",
    icon: XCircle,
    className: "border-destructive/30 text-destructive hover:bg-destructive/10",
    activeClassName: "bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90",
  },
  {
    value: "לא רלוונטי",
    label: "ל\"ר",
    icon: MinusCircle,
    className: "border-warning/30 text-warning-foreground hover:bg-warning/10",
    activeClassName: "bg-warning text-warning-foreground border-warning hover:bg-warning/90",
  },
]

const scoreOptions: Array<{
  value: ScoreValue
  label: string
  icon: typeof CheckCircle2
  className: string
  activeClassName: string
}> = [
  {
    value: "תקין",
    label: "תקין",
    icon: CheckCircle2,
    className: "border-success/30 text-success hover:bg-success/10",
    activeClassName: "bg-success text-success-foreground border-success hover:bg-success/90",
  },
  {
    value: "תקין גבולי",
    label: "תקין גבולי",
    icon: AlertCircle,
    className: "border-warning/30 text-warning-foreground hover:bg-warning/10",
    activeClassName: "bg-warning text-warning-foreground border-warning hover:bg-warning/90",
  },
  {
    value: "לא תקין",
    label: "לא תקין",
    icon: XCircle,
    className: "border-destructive/30 text-destructive hover:bg-destructive/10",
    activeClassName: "bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90",
  },
]

interface CriterionFieldProps {
  criterion: CriterionFromDb
  value: string | null | undefined
  comment: string | null | undefined
  onValueChange: (value: string) => void
  onCommentChange: (comment: string) => void
  readOnly?: boolean
}

export function CriterionField({
  criterion,
  value,
  comment,
  onValueChange,
  onCommentChange,
  readOnly = false,
}: CriterionFieldProps) {
  if (criterion.type === "RADIO") {
    const status = (value as AuditStatus) ?? null
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">{criterion.label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {readOnly ? (
            <p className="text-base text-muted-foreground">{status ?? "—"}</p>
          ) : (
            <div
              className="grid grid-cols-3 gap-2"
              role="radiogroup"
              aria-label={`סטטוס ${criterion.label}`}
            >
              {radioOptions.map((option) => {
                const Icon = option.icon
                const isActive = status === option.value
                return (
                  <button
                    key={option.value ?? "none"}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => onValueChange(option.value ?? "")}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 rounded-lg border-2 p-3 font-medium transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      "active:scale-95",
                      isActive ? option.activeClassName : option.className
                    )}
                  >
                    <Icon className="size-6" aria-hidden="true" />
                    <span className="text-sm">{option.label}</span>
                  </button>
                )
              })}
            </div>
          )}
          <div className="space-y-2">
            <label
              htmlFor={`comment-${criterion.id}`}
              className="text-sm font-medium text-muted-foreground"
            >
              הערות
            </label>
            {readOnly ? (
              <p className="min-h-10 text-base text-foreground whitespace-pre-wrap">{comment || "—"}</p>
            ) : (
              <Textarea
                id={`comment-${criterion.id}`}
                value={comment ?? ""}
                onChange={(e) => onCommentChange(e.target.value)}
                placeholder="הוסף הערה..."
                className="min-h-20 resize-none text-base"
              />
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (criterion.type === "SCORE") {
    const score = (value as ScoreValue) ?? null
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">{criterion.label}</CardTitle>
        </CardHeader>
        <CardContent>
          {readOnly ? (
            <p className="text-base text-muted-foreground">{score ?? "—"}</p>
          ) : (
            <div
              className="grid grid-cols-3 gap-2"
              role="radiogroup"
              aria-label={`ציון ${criterion.label}`}
            >
              {scoreOptions.map((option) => {
                const Icon = option.icon
                const isActive = score === option.value
                return (
                  <button
                    key={option.value ?? "none"}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => onValueChange(option.value ?? "")}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 rounded-lg border-2 p-3 font-medium transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      "active:scale-95",
                      isActive ? option.activeClassName : option.className
                    )}
                  >
                    <Icon className="size-6" aria-hidden="true" />
                    <span className="text-sm">{option.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground">{criterion.label}</CardTitle>
      </CardHeader>
      <CardContent>
        {readOnly ? (
          <p className="min-h-24 text-base text-foreground whitespace-pre-wrap">{value ?? "—"}</p>
        ) : (
          <Textarea
            value={value ?? ""}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder="הזן טקסט כאן..."
            className="min-h-64 resize-none text-base leading-relaxed"
          />
        )}
      </CardContent>
    </Card>
  )
}
