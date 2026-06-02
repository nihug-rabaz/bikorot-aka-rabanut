import { NextResponse } from "next/server"
import { exportAuditToDocx } from "@/app/lib/utils/export-audit"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { LOG_EVENTS } from "@/lib/logging/events"
import { actorFromSession, writeAppLog } from "@/lib/logging/logger"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }, // עדכון ה-Type ל-Promise
) {
  // חייבים לעשות await ל-params בגרסאות החדשות של Next.js
  const { id } = await params;
  const session = await getServerSession(authOptions)
  const actor = actorFromSession(session)

  try {
    const buffer = await exportAuditToDocx(id);

    const uint8Array = new Uint8Array(buffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="audit-${id}.docx"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    await writeAppLog({
      level: "ERROR",
      eventType: LOG_EVENTS.auditExportDocxFailure,
      status: "FAIL",
      source: "api.export.docx",
      action: "Export audit to docx",
      message: error instanceof Error ? error.message : "Unknown export error",
      actor,
      entityType: "audit",
      entityId: id,
    })
    return new NextResponse("Failed to export audit", { status: 500 });
  }
}

