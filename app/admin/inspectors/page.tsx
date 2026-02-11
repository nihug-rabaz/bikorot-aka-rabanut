import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { addInspector } from "./actions"
import { DeleteInspectorButton } from "./delete-inspector-button"
import { InspectorRoleMenu } from "./inspector-role-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserPlus, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

export default async function AdminInspectorsPage() {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as { role?: string })?.role

    if (userRole !== "ADMIN") redirect("/")

    const inspectors = await prisma.inspector.findMany({
        orderBy: { name: 'asc' }
    })

    return (
        <div className="p-8 max-w-4xl mx-auto" dir="rtl">
            <div className="flex items-center gap-3 mb-8">
                <ShieldCheck className="size-8 text-primary" />
                <h1 className="text-3xl font-black">ניהול מבקרים</h1>
            </div>

            {/* טופס הוספת מבקר */}
            <div className="bg-card p-6 rounded-xl border shadow-sm mb-10">
                <h2 className="text-lg font-bold mb-4">הוספת מבקר חדש</h2>
                <form action={addInspector} className="flex flex-col gap-3">
                    <div className="flex flex-col md:flex-row gap-3">
                        <Input name="name" placeholder="שם המבקר" className="flex-1" required />
                        <Input name="email" type="email" placeholder="אימייל גוגל של המבקר" className="flex-1" required />
                        <select name="role" className="flex h-10 w-full md:w-40 rounded-md border border-input bg-background px-3 py-2 text-sm">
                            <option value="INSPECTOR">מבקר</option>
                            <option value="ADMIN">אדמין</option>
                        </select>
                        <Button type="submit" className="gap-2 px-6">
                            <UserPlus className="size-4" />
                            הוסף
                        </Button>
                    </div>
                </form>
            </div>

            {/* רשימת המבקרים */}
            <div className="space-y-3">
                <h2 className="text-lg font-bold mb-2">מבקרים מאושרים ({inspectors.length})</h2>
                <div className="grid gap-3">
                    {inspectors.map((inspector) => (
                        <div
                            key={inspector.id}
                            className={cn(
                                "flex items-center justify-between p-4 border rounded-lg shadow-sm",
                                inspector.role === "ADMIN"
                                    ? "bg-primary/10 border-primary/30"
                                    : "bg-card border-border"
                            )}
                        >
                            <div>
                                <p className="font-bold text-lg">{inspector.name}</p>
                                <p className="text-sm text-muted-foreground">{inspector.email}</p>
                                <p className="text-sm font-medium mt-1">
                                    {inspector.role === "ADMIN" ? "אדמין" : "מבקר"}
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                <InspectorRoleMenu inspectorId={inspector.id} currentRole={inspector.role} />
                                <DeleteInspectorButton inspectorId={inspector.id} />
                            </div>
                        </div>
                    ))}
                </div>

                {inspectors.length === 0 && (
                    <p className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                        אין עדיין מבקרים רשומים במערכת
                    </p>
                )}
            </div>
        </div>
    )
}