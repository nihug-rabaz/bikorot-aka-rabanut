import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LOG_EVENTS } from "@/lib/logging/events"
import { actorFromSession, writeAppLog } from "@/lib/logging/logger"
import { InspectorsList } from "./inspectors-list"
import { ShieldCheck } from "lucide-react"
import { AddInspectorForm } from "./add-inspector-form"

export default async function AdminInspectorsPage() {
    const session = await getServerSession(authOptions)
    const actor = actorFromSession(session)
    const userRole = (session?.user as { role?: string })?.role

    if (userRole !== "ADMIN") {
        await writeAppLog({
            level: "WARN",
            eventType: LOG_EVENTS.authAccessDenied,
            status: "BLOCKED",
            source: "admin.inspectors.page",
            action: "Access admin inspectors page",
            message: "Access denied for non-admin user.",
            actor,
        })
        redirect("/")
    }

    const inspectors = await prisma.inspector.findMany({
        orderBy: { name: "asc" },
    })

    return (
        <div className="p-8 max-w-4xl mx-auto" dir="rtl">
            <div className="flex items-center gap-3 mb-8">
                <ShieldCheck className="size-8 text-primary" />
                <h1 className="text-3xl font-black">ניהול מבקרים</h1>
            </div>

            <div className="bg-card p-6 rounded-xl border shadow-sm mb-10">
                <h2 className="text-lg font-bold mb-4">הוספת מבקר חדש</h2>
                <AddInspectorForm />
            </div>

            <InspectorsList inspectors={inspectors} />
        </div>
    )
}