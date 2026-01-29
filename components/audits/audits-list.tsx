"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Inspector {
  id: string
  name: string
}

export interface AuditWithInspectors {
  id: string
  unitName: string
  date: string
  rabbiName: string
  finalScore: string | null
  inspectors: Inspector[]
}

interface AuditsListProps {
  audits: AuditWithInspectors[]
}

function matchesSearch(audit: AuditWithInspectors, query: string): boolean {
  if (!query.trim()) return true
  const q = query.trim().toLowerCase()
  const unitMatch = audit.unitName.toLowerCase().includes(q)
  const inspectorMatch = audit.inspectors.some((i) => i.name.toLowerCase().includes(q))
  return unitMatch || inspectorMatch
}

function formatDateDDMMYYYY(iso: string): string {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

function scoreBadgeVariant(score: string | null): "default" | "secondary" | "destructive" | "outline" {
  if (!score) return "outline"
  if (score === "תקין") return "default"
  if (score === "תקין גבולי") return "secondary"
  return "destructive"
}

function scoreBadgeClassName(score: string | null): string {
  if (!score) return ""
  if (score === "תקין") return "bg-green-600 text-white border-green-600 hover:bg-green-600"
  if (score === "תקין גבולי") return "bg-amber-500 text-white border-amber-500 hover:bg-amber-500"
  return "bg-red-600 text-white border-red-600 hover:bg-red-600"
}

export function AuditsList({ audits }: AuditsListProps) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(
    () => audits.filter((a) => matchesSearch(a, search)),
    [audits, search]
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          placeholder="חיפוש לפי שם יחידה או מבקר..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-12 pr-10 text-base"
          aria-label="חיפוש ביקורות"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          לא נמצאו ביקורות המשויכות אליך
        </p>
      ) : (
        <ul className="flex flex-col gap-3" role="list">
          {filtered.map((audit) => (
            <li key={audit.id}>
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <h2 className="text-lg font-bold text-foreground">{audit.unitName}</h2>
                  <p className="text-sm text-muted-foreground">
                    {formatDateDDMMYYYY(audit.date)}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium text-muted-foreground">רב יחידה: </span>
                    {audit.rabbiName}
                  </p>
                  {audit.inspectors.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      מבקרים: {audit.inspectors.map((i) => i.name).join(", ")}
                    </p>
                  )}
                  {audit.finalScore && (
                    <Badge
                      variant={scoreBadgeVariant(audit.finalScore)}
                      className={cn("mt-2 border", scoreBadgeClassName(audit.finalScore))}
                    >
                      ציון: {audit.finalScore}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
