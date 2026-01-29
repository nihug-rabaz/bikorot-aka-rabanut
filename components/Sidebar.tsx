"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { FilePlus, History, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"

const SIDEBAR_WIDTH = "12rem"

const navItems = [
  { href: "/", label: "ביקורת חדשה", icon: FilePlus },
  { href: "/audits", label: "היסטוריית ביקורות", icon: History },
] as const

function NavLinks({
  pathname,
  onLinkClick,
  className,
}: {
  pathname: string
  onLinkClick?: () => void
  className?: string
}) {
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
        <header className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSheetOpen(true)}
            aria-label="פתח תפריט"
          >
            <Menu className="size-6" aria-hidden />
          </Button>
        </header>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="right" className="w-[min(18rem,85vw)]">
            <SheetHeader>
              <SheetTitle>ניווט</SheetTitle>
            </SheetHeader>
            <NavLinks pathname={pathname} onLinkClick={() => setSheetOpen(false)} className="mt-4" />
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <aside
      className="fixed right-0 top-0 z-30 h-full w-[12rem] border-l border-border bg-card"
      style={{ width: SIDEBAR_WIDTH }}
      aria-label="סרגל ניווט"
    >
      <div className="flex h-full flex-col gap-4 p-4 pt-6">
        <NavLinks pathname={pathname} />
      </div>
    </aside>
  )
}

export const sidebarWidth = SIDEBAR_WIDTH
