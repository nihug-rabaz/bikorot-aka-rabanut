import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { addInspector, deleteInspector } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, UserPlus, ShieldCheck } from "lucide-react"

export default async function AdminInspectorsPage() {
    // אבטחה: בדיקה שרק אדמין יכול לראות את הדף
    const session = await getServerSession(authOptions)
    // הדפסה שתראה בטרמינל של ה-VSCode/Cursor
    const userRole = (session?.user as any)?.role;
    console.log("DEBUG - User Role:", userRole);

    if (userRole !== "ADMIN") {
        console.log("Not an admin! Redirecting...");
        redirect("/");
    }

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
                <form action={addInspector} className="flex flex-col md:flex-row gap-3">
                    <Input name="name" placeholder="שם המבקר" className="flex-1" required />
                    <Input name="email" type="email" placeholder="אימייל גוגל של המבקר" className="flex-1" required />
                    <Button type="submit" className="gap-2 px-6">
                        <UserPlus className="size-4" />
                        הוסף
                    </Button>
                </form>
            </div>

            {/* רשימת המבקרים */}
            <div className="space-y-3">
                <h2 className="text-lg font-bold mb-2">מבקרים מאושרים ({inspectors.length})</h2>
                <div className="grid gap-3">
                    {inspectors.map((inspector) => (
                        <div key={inspector.id} className="flex items-center justify-between p-4 bg-card border rounded-lg shadow-sm">
                            <div>
                                <p className="font-bold text-lg">{inspector.name}</p>
                                <p className="text-sm text-muted-foreground">{inspector.email}</p>
                            </div>
                            <form action={deleteInspector.bind(null, inspector.id)}>
                                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                                    <Trash2 className="size-5" />
                                </Button>
                            </form>
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