import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { addInspector } from "./actions"
import { InspectorsList } from "./inspectors-list"
import { getInspectorRoleLabel, INSPECTOR_ROLES } from "./inspector-roles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserPlus, ShieldCheck } from "lucide-react"

export default async function AdminInspectorsPage() {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as { role?: string })?.role

    if (userRole !== "ADMIN") redirect("/")

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
                <form action={addInspector} className="flex flex-col gap-3">
                    <div className="flex flex-col md:flex-row gap-3">
                        <Input name="name" placeholder="שם המבקר" className="flex-1" required />
                        <Input name="email" type="email" placeholder="אימייל גוגל של המבקר" className="flex-1" required />
                        <Input name="personalNumber" placeholder="מספר אישי" className="flex-1" required />
                        <select name="role" className="flex h-10 w-full md:w-40 rounded-md border border-input bg-background px-3 py-2 text-sm">
                            {INSPECTOR_ROLES.map((role) => (
                                <option key={role} value={role}>
                                    {getInspectorRoleLabel(role)}
                                </option>
                            ))}
                        </select>
                        <Button type="submit" className="gap-2 px-6">
                            <UserPlus className="size-4" />
                            הוסף
                        </Button>
                    </div>
                </form>
            </div>

            <InspectorsList inspectors={inspectors} />
        </div>
    )
}