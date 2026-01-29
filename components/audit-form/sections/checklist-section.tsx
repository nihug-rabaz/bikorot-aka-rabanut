"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react"
import type { ChecklistItem, AuditStatus } from "../types"

interface ChecklistSectionProps {
  title: string
  items: ChecklistItem[]
  onUpdate: (itemId: string, field: "status" | "comment", value: AuditStatus | string) => void
}

const statusOptions: Array<{
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
    label: "לא רלוונטי",
    icon: MinusCircle,
    className: "border-warning/30 text-warning-foreground hover:bg-warning/10",
    activeClassName: "bg-warning text-warning-foreground border-warning hover:bg-warning/90",
  },
]

export function ChecklistSection({ title, items, onUpdate }: ChecklistSectionProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      
      {items.map((item) => (
        <Card key={item.id} className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">
              {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="grid grid-cols-3 gap-2"
              role="radiogroup"
              aria-label={`סטטוס ${item.label}`}
            >
              {statusOptions.map((option) => {
                const Icon = option.icon
                const isActive = item.status === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => onUpdate(item.id, "status", option.value)}
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
            
            <div className="space-y-2">
              <label
                htmlFor={`comment-${item.id}`}
                className="text-sm font-medium text-muted-foreground"
              >
                הערות
              </label>
              <Textarea
                id={`comment-${item.id}`}
                value={item.comment}
                onChange={(e) => onUpdate(item.id, "comment", e.target.value)}
                placeholder="הוסף הערה..."
                className="min-h-20 resize-none text-base"
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
