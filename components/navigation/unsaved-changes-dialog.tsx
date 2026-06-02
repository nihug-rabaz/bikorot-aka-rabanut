"use client"

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
import { useNavigationGuard } from "@/app/lib/navigation/use-navigation-guard"
import { cn } from "@/lib/utils"

export function UnsavedChangesDialog() {
  const {
    isModalOpen,
    isSaving,
    confirmDiscardAndContinue,
    confirmSaveAndContinue,
    cancelNavigation,
  } = useNavigationGuard()

  return (
    <AlertDialog open={isModalOpen}>
      <AlertDialogContent className="text-right" dir="rtl">
        <AlertDialogHeader className="text-right">
          <AlertDialogTitle>יש שינויים שלא נשמרו</AlertDialogTitle>
          <AlertDialogDescription>
            בחר אם לשמור לפני מעבר לעמוד אחר.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-start">
          <AlertDialogCancel disabled={isSaving} onClick={cancelNavigation}>
            ביטול
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isSaving}
            onClick={(event) => {
              event.preventDefault()
              void confirmDiscardAndContinue()
            }}
            className={cn("bg-destructive text-white hover:bg-destructive/90")}
          >
            המשך ללא שמירה
          </AlertDialogAction>
          <AlertDialogAction
            disabled={isSaving}
            onClick={(event) => {
              event.preventDefault()
              void confirmSaveAndContinue()
            }}
          >
            {isSaving ? "שומר..." : "שמור והמשך"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
