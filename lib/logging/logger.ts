import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import type { Session } from "next-auth"

export type AppLogStatus = "SUCCESS" | "FAIL" | "BLOCKED"
export type AppLogLevel = "INFO" | "WARN" | "ERROR"

type AppLogInput = {
  level?: AppLogLevel
  eventType: string
  status: AppLogStatus
  source: string
  action: string
  entityType?: string
  entityId?: string
  message?: string
  metadata?: Record<string, unknown>
  actor?: {
    userId?: string
    email?: string
    name?: string
  }
}

function toPrismaJson(value: Record<string, unknown> | undefined) {
  if (!value) return undefined
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

export function actorFromSession(session: Session | null) {
  return {
    userId: ((session?.user as { id?: string } | undefined)?.id) ?? undefined,
    email: session?.user?.email ?? undefined,
    name: session?.user?.name ?? undefined,
  }
}

export async function writeAppLog(input: AppLogInput) {
  try {
    await prisma.appLog.create({
      data: {
        level: input.level ?? "INFO",
        eventType: input.eventType,
        status: input.status,
        source: input.source,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        message: input.message,
        metadata: toPrismaJson(input.metadata),
        actorUserId: input.actor?.userId,
        actorEmail: input.actor?.email,
        actorName: input.actor?.name,
      },
    })
  } catch (error) {
    console.error("Failed to write app log", error)
  }
}

export async function cleanupOldLogs(daysToKeep = 30) {
  try {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)
    await prisma.appLog.deleteMany({
      where: {
        createdAt: { lt: cutoff },
      },
    })
  } catch (error) {
    console.error("Failed to cleanup app logs", error)
  }
}
