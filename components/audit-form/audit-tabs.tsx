"use client"

import { useRef, useEffect } from "react"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

// אלו ההגדרות שהיו חסרות (ה-Interfaces)
interface Tab {
  id: string
  label: string
}

interface AuditTabsProps {
  tabs: readonly Tab[]
  currentTab: string
  onTabChange: (id: string) => void
}

export function AuditTabs({ tabs, currentTab, onTabChange }: AuditTabsProps) {
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  useEffect(() => {
    const currentButton = tabRefs.current.get(currentTab)
    if (currentButton) {
      currentButton.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      })
    }
  }, [currentTab])

  return (
    <nav
      className="sticky top-[73px] z-40 border-b border-border bg-card shadow-sm w-full"
      dir="rtl"
    >
      <ScrollArea className="w-full">
        <div
          className="flex flex-row items-center gap-2 px-4 py-3 min-w-max"
          role="tablist"
          style={{ direction: 'rtl' }} // הבטחה שהסדר הפנימי יהיה ימין לשמאל
        >
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  if (el) tabRefs.current.set(tab.id, el)
                }}
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-all whitespace-nowrap border",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                    : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                )}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
        <ScrollBar orientation="horizontal" className="hidden" />
      </ScrollArea>
    </nav>
  )
}