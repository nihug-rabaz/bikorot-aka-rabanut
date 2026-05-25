"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { InspectorCard, type InspectorListItem } from "./inspector-card"
import { getInspectorRolePluralLabel } from "./inspector-roles"

interface InspectorsListProps {
    inspectors: InspectorListItem[]
}

export function InspectorsList({ inspectors }: InspectorsListProps) {
    const [query, setQuery] = useState("")

    const normalizedQuery = query.trim().toLowerCase()
    const filteredInspectors = useMemo(() => {
        if (!normalizedQuery) return inspectors

        return inspectors.filter((inspector) => {
            const name = inspector.name.toLowerCase()
            const email = inspector.email?.toLowerCase() ?? ""

            return name.includes(normalizedQuery) || email.includes(normalizedQuery)
        })
    }, [inspectors, normalizedQuery])

    const counts = useMemo(() => {
        const admins = filteredInspectors.filter((inspector) => inspector.role === "ADMIN").length

        return {
            total: filteredInspectors.length,
            admins,
            inspectors: filteredInspectors.length - admins,
        }
    }, [filteredInspectors])

    const roleBreakdown = `${getInspectorRolePluralLabel("ADMIN")} (${counts.admins}), ${getInspectorRolePluralLabel("INSPECTOR")} (${counts.inspectors})`
    const title = normalizedQuery
        ? `מבקרים מאושרים (${counts.total} מתוך ${inspectors.length}) - ${roleBreakdown}`
        : `מבקרים מאושרים (${counts.total}) - ${roleBreakdown}`

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-lg font-bold">{title}</h2>
                <div className="relative w-full md:w-80">
                    <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="חיפוש לפי שם או אימייל..."
                        className="pr-9"
                    />
                </div>
            </div>

            <div className="grid gap-3">
                {filteredInspectors.map((inspector) => (
                    <InspectorCard key={inspector.id} inspector={inspector} />
                ))}
            </div>

            {filteredInspectors.length === 0 && (
                <p className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                    {normalizedQuery
                        ? `לא נמצאו מבקרים עבור "${query.trim()}"`
                        : "אין עדיין מבקרים רשומים במערכת"}
                </p>
            )}
        </div>
    )
}
