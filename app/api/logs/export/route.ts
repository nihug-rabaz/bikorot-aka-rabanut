import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { LOG_EVENTS } from "@/lib/logging/events"
import { actorFromSession, cleanupOldLogs, writeAppLog } from "@/lib/logging/logger"

function toCsvValue(value: unknown) {
  const raw = value == null ? "" : String(value)
  return `"${raw.replace(/"/g, "\"\"")}"`
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  const actor = actorFromSession(session)
  const role = (session?.user as { role?: string } | undefined)?.role

  if (!session || role !== "ADMIN") {
    await writeAppLog({
      level: "WARN",
      eventType: LOG_EVENTS.authAccessDenied,
      status: "BLOCKED",
      source: "api.logs.export",
      action: "Unauthorized logs export attempt",
      message: "Logs export blocked due to missing admin permissions.",
      actor,
    })
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const url = new URL(req.url)
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase()
  const days = Math.min(Math.max(Number.parseInt(url.searchParams.get("days") ?? "30", 10) || 30, 1), 30)
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  try {
    await cleanupOldLogs(30)

    const logs = await prisma.appLog.findMany({
      where: { createdAt: { gte: cutoff } },
      orderBy: { createdAt: "desc" },
    })

    if (format === "jsonl") {
      const jsonl = logs.map((log) => JSON.stringify(log)).join("\n")
      return new NextResponse(jsonl, {
        status: 200,
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Content-Disposition": `attachment; filename="app-logs-last-${days}-days.jsonl"`,
        },
      })
    }

    const headers = [
      "createdAt",
      "level",
      "eventType",
      "status",
      "source",
      "action",
      "actorUserId",
      "actorEmail",
      "actorName",
      "entityType",
      "entityId",
      "message",
      "metadata",
    ]

    const rows = logs.map((log) => [
      log.createdAt.toISOString(),
      log.level,
      log.eventType,
      log.status,
      log.source,
      log.action,
      log.actorUserId ?? "",
      log.actorEmail ?? "",
      log.actorName ?? "",
      log.entityType ?? "",
      log.entityId ?? "",
      log.message ?? "",
      log.metadata ? JSON.stringify(log.metadata) : "",
    ])

    const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(toCsvValue).join(",")).join("\n")}`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="app-logs-last-${days}-days.csv"`,
      },
    })
  } catch (error) {
    await writeAppLog({
      level: "ERROR",
      eventType: LOG_EVENTS.serverException,
      status: "FAIL",
      source: "api.logs.export",
      action: "Logs export failed",
      message: error instanceof Error ? error.message : "Unknown logs export error",
      actor,
    })
    return NextResponse.json({ error: "Failed to export logs" }, { status: 500 })
  }
}
