import { NextResponse } from "next/server"
import { LOG_EVENTS } from "@/lib/logging/events"
import { writeAppLog } from "@/lib/logging/logger"

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      message?: string
      stack?: string
      digest?: string
      pathname?: string
    }

    const stack = typeof body.stack === "string" ? body.stack.slice(0, 500) : undefined

    await writeAppLog({
      level: "ERROR",
      eventType: LOG_EVENTS.clientException,
      status: "FAIL",
      source: "client.error-boundary",
      action: "Client exception surfaced to user",
      message: body.message ?? "Client exception",
      metadata: {
        digest: body.digest,
        pathname: body.pathname,
        stack,
      },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
