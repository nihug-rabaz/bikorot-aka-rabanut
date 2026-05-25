"use client"

import { DeleteInspectorButton } from "./delete-inspector-button"
import { InspectorRoleMenu } from "./inspector-role-menu"
import { getInspectorRoleLabel } from "./inspector-roles"
import { cn } from "@/lib/utils"

export interface InspectorListItem {
    id: string
    name: string
    email: string | null
    role: string
}

interface InspectorCardProps {
    inspector: InspectorListItem
}

export function InspectorCard({ inspector }: InspectorCardProps) {
    return (
        <div
            className={cn(
                "flex items-center justify-between p-4 border rounded-lg shadow-sm",
                inspector.role === "ADMIN"
                    ? "bg-primary/10 border-primary/30"
                    : "bg-card border-border"
            )}
        >
            <div>
                <p className="font-bold text-lg">{inspector.name}</p>
                <p className="text-sm text-muted-foreground">{inspector.email}</p>
                <p className="text-sm font-medium mt-1">
                    {getInspectorRoleLabel(inspector.role)}
                </p>
            </div>
            <div className="flex items-center gap-1">
                <InspectorRoleMenu inspectorId={inspector.id} currentRole={inspector.role} />
                <DeleteInspectorButton inspectorId={inspector.id} />
            </div>
        </div>
    )
}
