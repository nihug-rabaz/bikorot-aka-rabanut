export const INSPECTOR_ROLES = ["INSPECTOR", "ADMIN"] as const

export type InspectorRole = (typeof INSPECTOR_ROLES)[number]

const ROLE_LABELS: Record<InspectorRole, { singular: string; plural: string }> = {
    INSPECTOR: { singular: "מבקר", plural: "מבקרים" },
    ADMIN: { singular: "מנהל", plural: "מנהלים" },
}

function isInspectorRole(role: string): role is InspectorRole {
    return INSPECTOR_ROLES.includes(role as InspectorRole)
}

export function getInspectorRoleLabel(role: string) {
    return isInspectorRole(role) ? ROLE_LABELS[role].singular : role
}

export function getInspectorRolePluralLabel(role: string) {
    return isInspectorRole(role) ? ROLE_LABELS[role].plural : role
}
