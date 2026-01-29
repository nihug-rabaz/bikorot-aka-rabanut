"use client"

import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, User, Hash, IdCard, Users } from "lucide-react"
import { InspectorMultiSelect } from "./inspector-multi-select"
import type { GeneralDetails, InspectorOption } from "../types"

interface GeneralDetailsSectionProps {
  data: GeneralDetails
  onUpdate: (field: keyof GeneralDetails, value: string | number) => void
  inspectors: InspectorOption[]
  selectedInspectorIds: string[]
  onInspectorToggle: (id: string) => void
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
  { key: "rabbiSeniority", label: "ותק הרב", placeholder: "0", type: "number", icon: Hash },
  { key: "rabbiIdNumber", label: "ת.ז. הרב", placeholder: "הזן ת.ז.", type: "text", icon: IdCard },
  { key: "ncoName", label: "שם המפקד", placeholder: "הזן שם המפקד", type: "text", icon: User },
  { key: "ncoSeniority", label: "ותק המפקד", placeholder: "0", type: "number", icon: Hash },
  { key: "ncoIdNumber", label: "ת.ז. המפקד", placeholder: "הזן ת.ז.", type: "text", icon: IdCard },
]

export function GeneralDetailsSection({
  data,
  onUpdate,
  inspectors,
  selectedInspectorIds,
  onInspectorToggle,
}: GeneralDetailsSectionProps) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-foreground">פרטים כלליים</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
              />
            </div>
          )
        })}
        {inspectors.length > 0 && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Users className="size-4 text-muted-foreground" aria-hidden="true" />
              בחר מבקר/ים
            </label>
            <InspectorMultiSelect
              inspectors={inspectors}
              selectedIds={selectedInspectorIds}
              onToggle={onInspectorToggle}
              placeholder="בחר מבקר/ים"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
