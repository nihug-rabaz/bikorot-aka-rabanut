"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { LOG_EVENTS } from "@/lib/logging/events"
import { actorFromSession, writeAppLog } from "@/lib/logging/logger"

type InspectorActionResult = {
    ok: boolean
    message?: string
    error?: string
    field?: "email" | "personalNumber"
}

export async function addInspector(formData: FormData) {
    const session = await getServerSession(authOptions)
    const actor = actorFromSession(session)
    const name = ((formData.get("name") as string) || "").trim()
    const email = ((formData.get("email") as string) || "").trim().toLowerCase()
    const personalNumber = ((formData.get("personalNumber") as string) || "").trim()
    const role = (formData.get("role") as string) || "INSPECTOR"

    if (!name || !email || !personalNumber) {
        await writeAppLog({
            level: "WARN",
            eventType: LOG_EVENTS.adminInspectorCreateFailure,
            status: "FAIL",
            source: "admin.inspectors",
            action: "Create inspector failed",
            message: "Inspector creation failed because required fields were missing.",
            actor,
        })
        return { ok: false, error: "חובה למלא שם, מייל ומספר אישי." } satisfies InspectorActionResult
    }

    const [emailExists, personalNumberExists] = await Promise.all([
        prisma.inspector.findFirst({
            where: { email },
            select: { id: true },
        }),
        prisma.inspector.findFirst({
            where: { personalNumber },
            select: { id: true },
        }),
    ])

    if (emailExists) {
        await writeAppLog({
            level: "WARN",
            eventType: LOG_EVENTS.adminInspectorCreateFailure,
            status: "FAIL",
            source: "admin.inspectors",
            action: "Create inspector failed",
            message: "Inspector creation blocked because email already exists.",
            actor,
            metadata: { email },
        })
        return {
            ok: false,
            error: "המייל כבר קיים ולכן לא ניתן להוסיף את המבקר.",
            field: "email",
        } satisfies InspectorActionResult
    }

    if (personalNumberExists) {
        await writeAppLog({
            level: "WARN",
            eventType: LOG_EVENTS.adminInspectorCreateFailure,
            status: "FAIL",
            source: "admin.inspectors",
            action: "Create inspector failed",
            message: "Inspector creation blocked because personal number already exists.",
            actor,
            metadata: { personalNumber: "masked" },
        })
        return {
            ok: false,
            error: "המספר האישי כבר קיים ולכן לא ניתן להוסיף את המבקר.",
            field: "personalNumber",
        } satisfies InspectorActionResult
    }

    try {
        const created = await prisma.inspector.create({
            data: {
                name,
                email,
                personalNumber,
                role: role === "ADMIN" ? "ADMIN" : "INSPECTOR",
            },
        })
        await writeAppLog({
            eventType: LOG_EVENTS.adminInspectorCreateSuccess,
            status: "SUCCESS",
            source: "admin.inspectors",
            action: "Inspector created",
            message: "Inspector created successfully.",
            actor,
            entityType: "inspector",
            entityId: created.id,
            metadata: { role: created.role },
        })
    } catch {
        await writeAppLog({
            level: "ERROR",
            eventType: LOG_EVENTS.adminInspectorCreateFailure,
            status: "FAIL",
            source: "admin.inspectors",
            action: "Create inspector failed",
            message: "Inspector creation failed due to database error.",
            actor,
        })
        return {
            ok: false,
            error: "שמירת המבקר נכשלה. נסה שוב.",
        } satisfies InspectorActionResult
    }

    revalidatePath("/admin/inspectors")
    return {
        ok: true,
        message: "המבקר התווסף בהצלחה.",
    } satisfies InspectorActionResult
}

export async function deleteInspector(id: string) {
    const session = await getServerSession(authOptions)
    const actor = actorFromSession(session)

    try {
        await prisma.inspector.delete({
            where: { id },
        })
        await writeAppLog({
            eventType: LOG_EVENTS.adminInspectorDeleteSuccess,
            status: "SUCCESS",
            source: "admin.inspectors",
            action: "Inspector deleted",
            message: "Inspector deleted successfully.",
            actor,
            entityType: "inspector",
            entityId: id,
        })
        revalidatePath("/admin/inspectors")
    } catch (error) {
        await writeAppLog({
            level: "ERROR",
            eventType: LOG_EVENTS.adminInspectorDeleteFailure,
            status: "FAIL",
            source: "admin.inspectors",
            action: "Delete inspector failed",
            message: error instanceof Error ? error.message : "Inspector delete failed.",
            actor,
            entityType: "inspector",
            entityId: id,
        })
    }
}

export async function updateInspectorRole(id: string, role: string) {
    const session = await getServerSession(authOptions)
    const actor = actorFromSession(session)

    if (role !== "ADMIN" && role !== "INSPECTOR") {
        await writeAppLog({
            level: "WARN",
            eventType: LOG_EVENTS.adminInspectorRoleUpdateFailure,
            status: "FAIL",
            source: "admin.inspectors",
            action: "Update inspector role failed",
            message: "Role update failed due to invalid role value.",
            actor,
            entityType: "inspector",
            entityId: id,
        })
        return
    }

    try {
        await prisma.inspector.update({
            where: { id },
            data: { role },
        })
        await writeAppLog({
            eventType: LOG_EVENTS.adminInspectorRoleUpdateSuccess,
            status: "SUCCESS",
            source: "admin.inspectors",
            action: "Inspector role updated",
            message: "Inspector role updated successfully.",
            actor,
            entityType: "inspector",
            entityId: id,
            metadata: { role },
        })
        revalidatePath("/admin/inspectors")
    } catch (error) {
        await writeAppLog({
            level: "ERROR",
            eventType: LOG_EVENTS.adminInspectorRoleUpdateFailure,
            status: "FAIL",
            source: "admin.inspectors",
            action: "Update inspector role failed",
            message: error instanceof Error ? error.message : "Inspector role update failed.",
            actor,
            entityType: "inspector",
            entityId: id,
        })
    }
}