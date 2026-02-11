"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function addInspector(formData: FormData) {
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const role = (formData.get("role") as string) || "INSPECTOR"

    if (!name || !email) return

    await prisma.inspector.create({
        data: { name, email, role: role === "ADMIN" ? "ADMIN" : "INSPECTOR" },
    })

    revalidatePath("/admin/inspectors")
}

export async function deleteInspector(id: string) {
    await prisma.inspector.delete({
        where: { id },
    })
    revalidatePath("/admin/inspectors")
}

export async function updateInspectorRole(id: string, role: string) {
    if (role !== "ADMIN" && role !== "INSPECTOR") return
    await prisma.inspector.update({
        where: { id },
        data: { role },
    })
    revalidatePath("/admin/inspectors")
}