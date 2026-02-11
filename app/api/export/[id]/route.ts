import { NextResponse } from "next/server"
import { exportAuditToDocx } from "@/app/lib/utils/export-audit"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }, // עדכון ה-Type ל-Promise
) {
  // חייבים לעשות await ל-params בגרסאות החדשות של Next.js
  const { id } = await params;

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
    return new NextResponse("Failed to export audit", { status: 500 });
  }
}

