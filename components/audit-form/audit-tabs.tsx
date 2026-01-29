"use client"

import { useRef, useEffect } from "react"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

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
    <nav className="sticky top-[73px] z-40 border-b border-border bg-card shadow-sm" aria-label="קטגוריות ביקורת">
      <ScrollArea className="w-full">
        <div className="flex gap-1 px-2 py-2" role="tablist">
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
                aria-controls={`panel-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-2" />
      </ScrollArea>
    </nav>
  )
}
