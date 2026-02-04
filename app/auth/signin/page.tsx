"use client"

import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { ShieldCheck, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Suspense } from "react"

// 1. קומפוננטת התוכן שמשתמשת ב-useSearchParams
function SignInContent() {
    const searchParams = useSearchParams()
    const error = searchParams.get("error")

    const errorMessage = error === "AccessDenied"
        ? "אין לך הרשאה לגשת למערכת. פנה למנהל להוספת המייל שלך."
        : "אירעה שגיאה בתהליך ההתחברות."

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
            <div className="w-full max-w-sm space-y-8 rounded-2xl border bg-card p-8 shadow-lg text-center">

                {/* לוגו וכותרת */}
                <div className="flex flex-col items-center gap-2">
                    <div className="bg-primary/10 p-3 rounded-xl">
                        <ShieldCheck className="size-10 text-primary" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground">ביקורת אכ"א</h1>
                    <p className="text-sm text-muted-foreground font-medium">מערכת דיגיטלית לניהול ביקורות</p>
                </div>

                {/* הצגת שגיאה במידה והכניסה נדחתה */}
                {error && (
                    <div className="flex items-center gap-2 p-3 text-sm font-bold text-destructive bg-destructive/10 rounded-lg border border-destructive/20 text-right leading-tight" dir="rtl">
                        <AlertCircle className="size-5 shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* כפתור התחברות גוגל */}
                <div className="space-y-4">
                    <Button
                        onClick={() => signIn("google", { callbackUrl: "/" })}
                        className="w-full gap-3 py-6 text-lg font-bold shadow-sm transition-all hover:shadow-md"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        התחברות באמצעות Google
                    </Button>

                    <p className="text-[11px] text-muted-foreground">
                        הכניסה מורשית למבקרים רשומים בלבד.
                        <br />
                        החיבור יישאר פעיל למשך 30 יום.
                    </p>
                </div>
            </div>
        </div>
    )
}

// 2. קומפוננטת העטיפה שמייצאת את הדף כראוי ל-Next.js
export default function SignIn() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-muted/30">
                <div className="animate-pulse text-muted-foreground font-medium">טוען...</div>
            </div>
        }>
            <SignInContent />
        </Suspense>
    )
}