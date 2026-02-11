"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

class AuditActionsService {
  static async delete(id: string) {
    await prisma.answer.deleteMany({
      where: { auditId: id },
    })

    await prisma.audit.delete({
      where: { id },
    })

    revalidatePath("/audits")
    revalidatePath("/")
  }

  static async toggleLock(id: string, currentLocked: boolean) {
    await prisma.audit.update({
      where: { id },
      data: { isLocked: !currentLocked },
    })

    revalidatePath("/audits")
    revalidatePath("/")
    revalidatePath(`/audit/${id}`)
  }

  static async resume(id: string) {
    await prisma.audit.update({
      where: { id },
      data: {
        status: "DRAFT",
        isLocked: false,
      },
    })

    revalidatePath("/audits")
    revalidatePath("/")
  }

  static async updateStatus(id: string, status: string) {
    await prisma.audit.update({
      where: { id },
      data: { status },
    })

    revalidatePath("/audits")
    revalidatePath("/")
  }

  static async setInspectors(auditId: string, inspectorIds: string[]) {
    await prisma.audit.update({
      where: { id: auditId },
      data: {
        inspectors: { set: inspectorIds.map((id) => ({ id })) },
      },
    })
    revalidatePath("/audits")
    revalidatePath("/")
  }
}

export async function deleteAudit(id: string) {
  await AuditActionsService.delete(id)
}

export async function toggleAuditLock(id: string, currentLocked: boolean) {
  await AuditActionsService.toggleLock(id, currentLocked)
}

export async function resumeAudit(id: string) {
  await AuditActionsService.resume(id)
}

export async function updateAuditStatus(id: string, status: string) {
  await AuditActionsService.updateStatus(id, status)
}

export async function setAuditInspectors(auditId: string, inspectorIds: string[]) {
  await AuditActionsService.setInspectors(auditId, inspectorIds)
}

