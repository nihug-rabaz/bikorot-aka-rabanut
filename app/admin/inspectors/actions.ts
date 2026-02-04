"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function addInspector(formData: FormData) {
    const name = formData.get("name") as string
    const email = formData.get("email") as string

    if (!name || !email) return

    await prisma.inspector.create({
        data: { name, email },
    })

    // זה מרענן את הדף באופן אוטומטי כדי שנראה את המבקר החדש
    revalidatePath("/admin/inspectors")
}

export async function deleteInspector(id: string) {
    await prisma.inspector.delete({
        where: { id },
    })
    revalidatePath("/admin/inspectors")
}