"use client"

import { useState, useMemo, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Search, Share2, Play, Trash2, FileText, Lock, Unlock, Clock, CheckCircle2
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  deleteAudit,
  toggleAuditLock,
  resumeAudit,
  setAuditInspectors,
} from "@/app/lib/actions/audit-actions"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

export interface Inspector {
  id: string
  name: string
}

export interface AuditWithInspectors {
  id: string
  unitName: string
  date: string
  rabbiName: string
  finalScore: string | null
  inspectors: Inspector[]
  status: "DRAFT" | "PUBLISHED" | string
  isLocked: boolean
}

interface AuditsListProps {
  audits: AuditWithInspectors[]
  allInspectors: Inspector[]
}

export function AuditsList({ audits, allInspectors }: AuditsListProps) {
  const [search, setSearch] = useState("")
  const [isPending, startTransition] = useTransition()
  const [auditToDelete, setAuditToDelete] = useState<AuditWithInspectors | null>(null)
  const router = useRouter()

  const handleAction = (e: React.MouseEvent, type: string, audit: AuditWithInspectors) => {
    e.preventDefault()
    e.stopPropagation()
    if (isPending) return

    switch (type) {
      case "toggleLock":
        startTransition(() => {
          toggleAuditLock(audit.id, audit.isLocked)
        })
        break
      case "resume":
        startTransition(() => {
          resumeAudit(audit.id).then(() => {
            router.push(`/audit/${audit.id}`)
          })
        })
        break
      case "export":
        window.open(`/api/export/${audit.id}`, "_blank")
        break
      case "share":
        break
    }
  }

  const { openAudits, closedAudits } = useMemo(() => {
    const q = search.trim().toLowerCase()

    const filtered = audits.filter((a) => {
      if (!q) return true
      return (
        a.unitName.toLowerCase().includes(q) ||
        a.inspectors.some((i) => i.name.toLowerCase().includes(q))
      )
    })

    const open = filtered
      .filter((a) => a.status === "DRAFT" && !a.isLocked)
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime(),
      )

    const closed = filtered
      .filter((a) => a.status !== "DRAFT" || a.isLocked)
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime(),
      )

    return { openAudits: open, closedAudits: closed }
  }, [audits, search])

  const RenderAuditGroup = ({ title, items, icon: Icon, badgeColor, showResume }: { title: string; items: AuditWithInspectors[]; icon: any; badgeColor: string; showResume: boolean }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b pb-2 px-1">
        <Icon className={cn("size-5", badgeColor)} />
        <h2 className="text-lg font-bold">{title}</h2>
        <Badge variant="secondary" className="mr-auto">{items.length}</Badge>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((audit: AuditWithInspectors) => (
          <Card
            key={audit.id}
            className={cn(
              "group transition-all hover:shadow-md border-r-4",
              audit.status === "DRAFT" ? "border-r-orange-400" : "border-r-green-500",
              !audit.isLocked && audit.status !== "DRAFT" && "bg-muted/40",
              audit.isLocked && "opacity-80 bg-slate-50"
            )}
          >
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* תוכן הביקורת כקישור */}
                <Link href={`/audit/${audit.id}`} className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                      {audit.unitName}
                    </h3>
                    {audit.status !== "DRAFT" && (
                      <Badge variant="outline" className="text-xs">
                        סגורה
                      </Badge>
                    )}
                    {audit.isLocked && (
                      <Badge variant="secondary" className="text-xs">
                        נעולה
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>{new Date(audit.date).toLocaleDateString('he-IL')}</span>
                    <span>רב: {audit.rabbiName}</span>
                    {audit.inspectors.length > 0 && (
                      <span>
                        מבקרים: {audit.inspectors.map((i) => i.name).join(", ")}
                      </span>
                    )}
                    {audit.finalScore && (
                      <span className="font-bold text-primary">ציון: {audit.finalScore}</span>
                    )}
                  </div>
                </Link>

                {/* כפתורי פעולה */}
                <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => e.stopPropagation()}
                        title="הוסף/הסר מבקרים"
                        disabled={isPending}
                      >
                        <Share2 className="size-4 text-blue-600" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuLabel>מבקרים בביקורת</DropdownMenuLabel>
                      {allInspectors.map((inspector) => {
                        const isOnAudit = audit.inspectors.some((i) => i.id === inspector.id)
                        return (
                          <DropdownMenuCheckboxItem
                            key={inspector.id}
                            checked={isOnAudit}
                            onCheckedChange={() => {
                              const nextIds = isOnAudit
                                ? audit.inspectors.filter((i) => i.id !== inspector.id).map((i) => i.id)
                                : [...audit.inspectors.map((i) => i.id), inspector.id]
                              startTransition(() => setAuditInspectors(audit.id, nextIds))
                            }}
                          >
                            {inspector.name}
                          </DropdownMenuCheckboxItem>
                        )
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* 2. המשך ביקורת (מוצג רק אם שמור) */}
                  {showResume && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleAction(e, "resume", audit)}
                      title="המשך ביקורת (חזרה לטיוטה)"
                      disabled={isPending}
                    >
                      <Play className="size-4 text-green-600" />
                    </Button>
                  )}

                  {/* 4. פתח מסמך */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleAction(e, "export", audit)}
                    title="ייצוא ל-Word"
                    disabled={isPending}
                  >
                    <FileText className="size-4 text-slate-600" />
                  </Button>

                  {/* 5. נעילה/פתיחה */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleAction(e, "toggleLock", audit)}
                    title={audit.isLocked ? "פתח לעריכה" : "סגור לעריכה"}
                    disabled={isPending}
                  >
                    {audit.isLocked ? (
                      <Lock className="size-4 text-red-500" />
                    ) : (
                      <Unlock className="size-4 text-green-500" />
                    )}
                  </Button>

                  {/* 3. מחיקה */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-destructive/10"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setAuditToDelete(audit)
                    }}
                    disabled={isPending}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      {/* חיפוש */}
      <div className="relative group">
        <Search className="absolute right-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          type="search"
          placeholder="חיפוש ביקורת לפי יחידה או מבקר..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-14 pr-11 text-lg shadow-sm"
        />
      </div>

      {openAudits.length === 0 && closedAudits.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed">
          <p className="text-muted-foreground text-lg">לא נמצאו ביקורות תואמות</p>
        </div>
      ) : (
        <div className="space-y-12">
          {openAudits.length > 0 && (
            <RenderAuditGroup
              title="ביקורות פתוחות (טיוטה)"
              items={openAudits}
              icon={Clock}
              badgeColor="text-orange-500"
              showResume={false}
            />
          )}

          {closedAudits.length > 0 && (
            <RenderAuditGroup
              title="ביקורות סגורות"
              items={closedAudits}
              icon={CheckCircle2}
              badgeColor="text-green-600"
              showResume={true}
            />
          )}
        </div>
      )}

      <AlertDialog
        open={!!auditToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setAuditToDelete(null)
          }
        }}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              האם אתה בטוח?
            </AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את הביקורת לצמיתות.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              ביטול
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!auditToDelete) return
                startTransition(() => {
                  deleteAudit(auditToDelete.id)
                })
                setAuditToDelete(null)
              }}
            >
              מחיקה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}