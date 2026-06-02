import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LOG_EVENTS } from "@/lib/logging/events"
import { actorFromSession, writeAppLog } from "@/lib/logging/logger"
import { ShieldCheck } from "lucide-react"
import { FormEditorClient } from "./form-editor-client"

export default async function AdminFormEditorPage() {
  const session = await getServerSession(authOptions)
  const actor = actorFromSession(session)
  const userRole = (session?.user as { role?: string })?.role
  if (userRole !== "ADMIN") {
    await writeAppLog({
      level: "WARN",
      eventType: LOG_EVENTS.authAccessDenied,
      status: "BLOCKED",
      source: "admin.form-editor.page",
      action: "Access form editor page",
      message: "Access denied for non-admin user.",
      actor,
    })
    redirect("/")
  }

  const categories = await prisma.category.findMany({
    orderBy: { order: "asc" },
    include: {
      criteria: {
        orderBy: { order: "asc" },
        include: {
          _count: {
            select: { answers: true },
          },
        },
      },
    },
  })

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8" dir="rtl">
      <div className="flex items-center gap-3">
        <ShieldCheck className="size-8 text-primary" />
        <h1 className="text-3xl font-black">עריכת טופס</h1>
      </div>
      <FormEditorClient categories={categories} />
    </div>
  )
}
