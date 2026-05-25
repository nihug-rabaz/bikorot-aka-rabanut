import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { FormEditorClient } from "./form-editor-client"

export default async function AdminFormEditorPage() {
  const session = await getServerSession(authOptions)
  const userRole = (session?.user as { role?: string })?.role
  if (userRole !== "ADMIN") redirect("/")

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
