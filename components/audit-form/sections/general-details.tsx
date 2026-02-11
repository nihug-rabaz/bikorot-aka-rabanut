"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, User, Hash, IdCard, Users, CalendarDays } from "lucide-react"
import { InspectorMultiSelect } from "./inspector-multi-select"
import type { GeneralDetails, InspectorOption } from "../types"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

interface GeneralDetailsSectionProps {
  data: GeneralDetails
  onUpdate: (field: keyof GeneralDetails, value: string | number) => void
  inspectors: InspectorOption[]
  selectedInspectorIds: string[]
  onInspectorToggle: (id: string) => void
  readOnly?: boolean
}

const fields: Array<{
  key: keyof GeneralDetails
  label: string
  placeholder: string
  type: "text" | "number"
  icon: typeof Building2
}> = [
  { key: "unitName", label: "שם היחידה", placeholder: "הזן שם יחידה", type: "text", icon: Building2 },
  { key: "rabbiName", label: "שם הרב", placeholder: "הזן שם הרב", type: "text", icon: User },
  { key: "rabbiRank", label: " דרגת הרב", placeholder: "הזן דרגת הרב", type: "text", icon: User },
  { key: "rabbiSeniority", label: "ותק הרב", placeholder: "0", type: "number", icon: Hash },
  { key: "rabbiIdNumber", label: "מ.א. הרב", placeholder: "הזן ת.ז.", type: "text", icon: IdCard },
  { key: "ncoName", label: "שם נגד/אזרח מכ\"ש", placeholder: "הזן שם המפקד", type: "text", icon: User },
  { key: "ncoRank", label: "דרגת נגד/אזרח מכ\"ש", placeholder: "הזן דרגת המפקד", type: "text", icon: User },
  { key: "ncoSeniority", label: "ותק נגד/אזרח מכ\"ש", placeholder: "0", type: "number", icon: Hash },
  { key: "ncoIdNumber", label: "מ.א. נגד/אזרח מכ\"ש", placeholder: "הזן ת.ז.", type: "text", icon: IdCard },
]

export function GeneralDetailsSection({
  data,
  onUpdate,
  inspectors,
  selectedInspectorIds,
  onInspectorToggle,
  readOnly = false,
}: GeneralDetailsSectionProps) {
  const [isDateOpen, setIsDateOpen] = useState(false)
  const selectedDate = data.date ? new Date(data.date) : new Date()

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-foreground">פרטים כלליים</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="audit-date"
            className="flex items-center gap-2 text-sm font-semibold text-foreground"
          >
            <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
            תאריך ביקורת
          </label>
          <Popover open={readOnly ? false : isDateOpen} onOpenChange={readOnly ? undefined : setIsDateOpen}>
            <InputGroup>
              <InputGroupInput
                id="audit-date"
                readOnly
                disabled={readOnly}
                value={selectedDate.toLocaleDateString("he-IL", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              />
              {!readOnly && (
                <InputGroupAddon align="inline-end">
                  <PopoverTrigger asChild>
                    <InputGroupButton aria-label="בחר תאריך">
                      <CalendarDays className="size-4" aria-hidden="true" />
                    </InputGroupButton>
                  </PopoverTrigger>
                </InputGroupAddon>
              )}
            </InputGroup>
            {!readOnly && (
              <PopoverContent align="end" className="p-2">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (!date) return
                    onUpdate("date", date.toISOString())
                    setIsDateOpen(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            )}
          </Popover>
        </div>
        {fields.map((field) => {
          const Icon = field.icon
          const value = data[field.key]
          return (
            <div key={field.key} className="space-y-2">
              <label
                htmlFor={field.key}
                className="flex items-center gap-2 text-sm font-semibold text-foreground"
              >
                <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                {field.label}
              </label>
              <Input
                id={field.key}
                type={field.type}
                value={typeof value === "number" ? (value === 0 ? "" : value) : value}
                onChange={(e) =>
                  onUpdate(
                    field.key,
                    field.type === "number" ? (e.target.value ? parseInt(e.target.value, 10) : 0) : e.target.value
                  )
                }
                placeholder={field.placeholder}
                className="h-12 text-base"
                readOnly={readOnly}
                disabled={readOnly}
              />
              {field.key === "unitName" && (
                <p className="pt-2 text-base font-extrabold text-foreground">
                  רב מבוקר
                </p>
              )}
              {field.key === "rabbiIdNumber" && (
                <p className="pt-2 text-base font-extrabold text-foreground">
                  נגד/אזרח מכ"ש
                </p>
              )}
            </div>
          )
        })}
        {inspectors.length > 0 && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Users className="size-4 text-muted-foreground" aria-hidden="true" />
              בחר מבקר/ים
            </label>
            {readOnly ? (
              <p className="text-base text-muted-foreground">
                {inspectors.filter((i) => selectedInspectorIds.includes(i.id)).map((i) => i.name).join(", ") || "—"}
              </p>
            ) : (
              <InspectorMultiSelect
                inspectors={inspectors}
                selectedIds={selectedInspectorIds}
                onToggle={onInspectorToggle}
                placeholder="בחר מבקר/ים"
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
