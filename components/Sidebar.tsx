"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { FilePlus, History, Menu, LogIn, LogOut, User, Users } from "lucide-react" // הוספנו אייקונים
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import { signIn, signOut, useSession } from "next-auth/react" // הוספנו את ה-Auth

const SIDEBAR_WIDTH = "12rem"

const navItems = [
  { href: "/", label: "ביקורת חדשה", icon: FilePlus },
  { href: "/audits", label: "היסטוריית ביקורות", icon: History },
] as const

// קומפוננטה חדשה לכפתורי ההתחברות כדי לא לשכפל קוד
function AuthButtons() {
  const { data: session } = useSession()

  if (session) {
    return (
      <div className="flex flex-col gap-2 border-t pt-4 mt-auto">
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
          <User className="size-4" />
          <span className="truncate">{session.user?.name}</span>
        </div>
        <Button
          variant="ghost"
          className="justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={() => signOut()}
        >
          <LogOut className="size-5" />
          התנתק
        </Button>
      </div>
    )
  }

  return (
    <div className="border-t pt-4 mt-auto">
      <Button
        variant="default"
        className="w-full justify-start gap-3"
        onClick={() => signIn("google")}
      >
        <LogIn className="size-5" />
        התחבר עם גוגל
      </Button>
    </div>
  )
}

function NavLinks({
  pathname,
  onLinkClick,
  className,
}: {
  pathname: string
  onLinkClick?: () => void
  className?: string
}) {
  const { data: session } = useSession() // [!code ++] מושכים את הסשן
  const isAdmin = (session?.user as any)?.role === "ADMIN" // [!code ++] בדיקת אדמין

  return (
    <nav className={cn("flex flex-col gap-1", className)} aria-label="ניווט ראשי">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onLinkClick}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            {item.label}
          </Link>
        )
      })}

      {/* כפתור ניהול מבקרים - מופיע רק לאדמין */}
      {isAdmin && (
        <Link
          href="/admin/inspectors"
          onClick={onLinkClick}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors mt-2",
            "bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-950/20 dark:text-orange-400",
            pathname === "/admin/inspectors" ? "ring-2 ring-orange-500/50 shadow-sm" : ""
          )}
        >
          <Users className="size-5 shrink-0" />
          <span>ניהול מבקרים</span>
        </Link>
      )}
    </nav>
  )
}
export function Sidebar() {
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const [sheetOpen, setSheetOpen] = useState(false)

  if (isMobile) {
    return (

      <>
        <header className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between border-b border-white/10 bg-card/80 backdrop-blur-md px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSheetOpen(true)}
            className="hover:bg-white/10"
          >
            <Menu className="size-6 text-primary" />
          </Button>
          <div className="font-bold text-sm">ביקורת אכ"א</div>
          <div className="w-10"></div> {/* לשמור על איזון במרכז */}
        </header>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="right" className="w-[min(18rem,85vw)] flex flex-col p-6 rounded-l-3xl border-l-0">
            <SheetHeader className="text-right">
              <SheetTitle className="text-2xl font-black text-primary">תפריט</SheetTitle>
            </SheetHeader>
            <NavLinks pathname={pathname} onLinkClick={() => setSheetOpen(false)} className="mt-4" />
            <AuthButtons /> {/* כפתור במובייל */}
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <aside
      className="fixed right-0 top-0 z-30 h-full border-l border-border bg-card"
      style={{ width: SIDEBAR_WIDTH }}
      aria-label="סרגל ניווט"
    >
      <div className="flex h-full flex-col gap-4 p-4 pt-6">
        <NavLinks pathname={pathname} />
        <AuthButtons /> {/* כפתור בדסקטופ - יופיע בתחתית בזכות mt-auto */}
      </div>
    </aside>
  )
}

export const sidebarWidth = SIDEBAR_WIDTH