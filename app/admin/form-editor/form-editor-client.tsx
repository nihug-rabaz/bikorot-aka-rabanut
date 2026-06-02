"use client"

import { type FormEvent, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ARCHIVED_CATEGORY_LABEL, ARCHIVED_CATEGORY_NAME } from "@/lib/form-editor/constants"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  addCategory,
  addCriterion,
  deleteCategory,
  moveCategoryWithinList,
  moveCriterionToCategory,
  moveCriterionWithinCategory,
  permanentlyDeleteCriterion,
  renameCategory,
  renameCriterion,
  restoreCriterion,
  softDeleteCriterion,
} from "./actions"

type EditorCriterion = {
  id: string
  label: string
  type: string
  order: number
  isActive: boolean
  _count: {
    answers: number
  }
}

type EditorCategory = {
  id: string
  name: string
  order: number
  criteria: EditorCriterion[]
}

interface FormEditorClientProps {
  categories: EditorCategory[]
}

const CRITERION_TYPES = [
  { value: "RADIO", label: "בחירה (תקין/לא תקין/ל\"ר)" },
  { value: "TEXT", label: "טקסט חופשי" },
  { value: "SCORE", label: "ציון" },
] as const

type CategoryAction = "add" | "rename" | "reorder" | "delete"
type CriterionAction = "add" | "rename" | "reorder" | "move" | "remove"
type FormEditorAction = (formData: FormData) => Promise<{ ok: boolean; message?: string; error?: string }>

export function FormEditorClient({ categories }: FormEditorClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const visibleCategories = useMemo(
    () => categories.filter((category) => category.name !== ARCHIVED_CATEGORY_NAME),
    [categories],
  )
  const [categoryAction, setCategoryAction] = useState<CategoryAction>("rename")
  const [criterionAction, setCriterionAction] = useState<CriterionAction>("rename")
  const [selectedCategoryId, setSelectedCategoryId] = useState(visibleCategories[0]?.id ?? "")

  const firstActiveCriterionId = useMemo(() => {
    for (const category of visibleCategories) {
      const active = category.criteria.find((criterion) => criterion.isActive)
      if (active) return active.id
    }
    return ""
  }, [visibleCategories])

  const firstDeletedCriterionId = useMemo(() => {
    for (const category of categories) {
      const deleted = category.criteria.find((criterion) => !criterion.isActive)
      if (deleted) return deleted.id
    }
    return ""
  }, [categories])

  const [selectedActiveCriterionId, setSelectedActiveCriterionId] = useState(firstActiveCriterionId)
  const [selectedDeletedCriterionId, setSelectedDeletedCriterionId] = useState(firstDeletedCriterionId)

  const selectedCategory = visibleCategories.find((category) => category.id === selectedCategoryId) ?? null
  const selectedActiveCriterion =
    visibleCategories.flatMap((category) => category.criteria).find((criterion) => criterion.id === selectedActiveCriterionId) ??
    null
  const selectedDeletedCriterion =
    categories.flatMap((category) => category.criteria).find((criterion) => criterion.id === selectedDeletedCriterionId) ??
    null
  const canPermanentlyDeleteSelectedDeletedCriterion =
    !!selectedDeletedCriterion &&
    !selectedDeletedCriterion.isActive &&
    selectedDeletedCriterion._count.answers === 0
  const permanentDeleteFormId = selectedDeletedCriterionId
    ? `permanent-delete-${selectedDeletedCriterionId}`
    : "permanent-delete-empty"

  const hasActiveCriteria = visibleCategories.some((category) => category.criteria.some((criterion) => criterion.isActive))
  const hasDeletedCriteria = categories.some((category) => category.criteria.some((criterion) => !criterion.isActive))

  const runAction = (
    action: FormEditorAction,
    fallbackSuccessMessage: string,
  ) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await action(formData)
      if (!result.ok) {
        toast.error(result.error ?? "הפעולה נכשלה.", { duration: 2000 })
        return
      }
      toast.success(result.message ?? fallbackSuccessMessage, { duration: 2000 })
      router.refresh()
    })
  }

  const getCategoryLabel = (category: EditorCategory) =>
    category.name === ARCHIVED_CATEGORY_NAME ? ARCHIVED_CATEGORY_LABEL : category.name

  return (
    <div className="space-y-6">
      <section className="bg-card p-6 rounded-xl border shadow-sm space-y-4">
        <h2 className="text-xl font-bold">ניהול קטגוריות</h2>

        <div className="grid gap-3 lg:grid-cols-2">
          <select
            value={categoryAction}
            onChange={(event) => setCategoryAction(event.target.value as CategoryAction)}
            className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="add">הוספת קטגוריה</option>
            <option value="rename">שינוי מלל קטגוריה</option>
            <option value="reorder">שינוי מיקום קטגוריה</option>
            <option value="delete">מחיקת קטגוריה</option>
          </select>

          <select
            value={selectedCategoryId}
            onChange={(event) => setSelectedCategoryId(event.target.value)}
            disabled={categoryAction === "add" || visibleCategories.length === 0}
            className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
          >
            {visibleCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {categoryAction === "add" && (
          <form onSubmit={runAction(addCategory, "הקטגוריה נוספה בהצלחה.")} className="flex flex-col md:flex-row gap-3">
            <Input name="name" placeholder="שם קטגוריה חדשה" className="flex-1" required />
            <Button type="submit" disabled={isPending}>הוסף קטגוריה</Button>
          </form>
        )}

        {categoryAction === "rename" && (
          <form onSubmit={runAction(renameCategory, "שם הקטגוריה עודכן בהצלחה.")} className="flex flex-col md:flex-row gap-3">
            <input type="hidden" name="categoryId" value={selectedCategoryId} />
            <Input
              name="name"
              defaultValue={selectedCategory?.name ?? ""}
              key={selectedCategoryId}
              placeholder="שם קטגוריה"
              className="flex-1"
              required
            />
            <Button type="submit" disabled={!selectedCategoryId || isPending}>
              עדכן קטגוריה
            </Button>
          </form>
        )}

        {categoryAction === "delete" && (
          <form onSubmit={runAction(deleteCategory, "הקטגוריה נמחקה בהצלחה.")} className="flex flex-col gap-3">
            <input type="hidden" name="categoryId" value={selectedCategoryId} />
            <p className="text-sm text-muted-foreground">
              מחיקת קטגוריה תתאפשר רק כאשר אין בה קריטריונים כלל.
            </p>
            <Button
              type="submit"
              variant="destructive"
              disabled={!selectedCategoryId || isPending}
              className="w-fit"
            >
              מחק קטגוריה
            </Button>
          </form>
        )}

        {categoryAction === "reorder" && (
          <form onSubmit={runAction(moveCategoryWithinList, "מיקום הקטגוריה עודכן בהצלחה.")} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="categoryId" value={selectedCategoryId} />
            <Input
              name="position"
              type="number"
              min={1}
              defaultValue={selectedCategory?.order ?? 1}
              key={selectedCategoryId}
              className="w-28"
            />
            <Button type="submit" variant="outline" disabled={!selectedCategoryId || isPending}>
              עדכן מיקום קטגוריה
            </Button>
          </form>
        )}
      </section>

      <section className="bg-card p-6 rounded-xl border shadow-sm space-y-4">
        <h2 className="text-xl font-bold">ניהול קריטריונים פעילים</h2>

        <div className="grid gap-3 lg:grid-cols-2">
          <select
            value={criterionAction}
            onChange={(event) => setCriterionAction(event.target.value as CriterionAction)}
            className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="add">הוספת קריטריון</option>
            <option value="rename">שינוי מלל קריטריון</option>
            <option value="reorder">שינוי מיקום בתוך הקטגוריה</option>
            <option value="move">העברה בין קטגוריות</option>
            <option value="remove">הסרת קריטריון</option>
          </select>

          <select
            value={selectedActiveCriterionId}
            onChange={(event) => setSelectedActiveCriterionId(event.target.value)}
            disabled={criterionAction === "add" || !hasActiveCriteria}
            className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
          >
            {categories.map((category) => {
              const activeCriteria = category.criteria.filter((criterion) => criterion.isActive)
              if (!activeCriteria.length) return null
              return (
                <optgroup key={category.id} label={category.name}>
                  {activeCriteria.map((criterion) => (
                    <option key={criterion.id} value={criterion.id}>
                      {criterion.label}
                    </option>
                  ))}
                </optgroup>
              )
            })}
          </select>
        </div>

        {criterionAction === "add" && (
          <form onSubmit={runAction(addCriterion, "הקריטריון נוסף בהצלחה.")} className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]">
            <select
              name="categoryId"
              className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={selectedCategoryId || visibleCategories[0]?.id}
            >
              {visibleCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <Input name="label" placeholder="מלל הקריטריון" required />
            <select
              name="type"
              className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue="RADIO"
            >
              {CRITERION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <Button type="submit" disabled={isPending}>הוסף</Button>
          </form>
        )}

        {criterionAction === "rename" && (
          <form onSubmit={runAction(renameCriterion, "מלל הקריטריון עודכן בהצלחה.")} className="flex flex-col md:flex-row gap-3">
            <input type="hidden" name="criterionId" value={selectedActiveCriterionId} />
            <Input
              name="label"
              defaultValue={selectedActiveCriterion?.label ?? ""}
              key={selectedActiveCriterionId}
              placeholder="מלל קריטריון"
              className="flex-1"
              required
            />
            <Button type="submit" disabled={!selectedActiveCriterionId || isPending}>
              עדכן מלל
            </Button>
          </form>
        )}

        {criterionAction === "reorder" && (
          <form onSubmit={runAction(moveCriterionWithinCategory, "מיקום הקריטריון עודכן בהצלחה.")} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="criterionId" value={selectedActiveCriterionId} />
            <Input
              name="position"
              type="number"
              min={1}
              defaultValue={selectedActiveCriterion?.order ?? 1}
              key={selectedActiveCriterionId}
              className="w-28"
            />
            <Button type="submit" variant="outline" disabled={!selectedActiveCriterionId || isPending}>
              עדכן מיקום
            </Button>
          </form>
        )}

        {criterionAction === "move" && (
          <form onSubmit={runAction(moveCriterionToCategory, "הקריטריון הועבר בהצלחה.")} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="criterionId" value={selectedActiveCriterionId} />
            <select
              name="targetCategoryId"
              className="h-10 w-full min-w-0 sm:w-auto sm:min-w-52 rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={selectedCategoryId || visibleCategories[0]?.id}
            >
              {visibleCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <Input
              name="targetPosition"
              type="number"
              min={1}
              defaultValue={1}
              className="w-28"
            />
            <Button type="submit" variant="outline" disabled={!selectedActiveCriterionId || isPending}>
              העבר
            </Button>
          </form>
        )}

        {criterionAction === "remove" && (
          <form onSubmit={runAction(softDeleteCriterion, "הקריטריון הוסר בהצלחה.")} className="space-y-3">
            <input type="hidden" name="criterionId" value={selectedActiveCriterionId} />
            <p className="text-sm text-muted-foreground">הקריטריון יוסר מהטפסים ויהיה ניתן לשחזור.</p>
            <Button type="submit" variant="destructive" disabled={!selectedActiveCriterionId || isPending}>
              הסר קריטריון
            </Button>
          </form>
        )}
      </section>

      <section className="bg-card p-6 rounded-xl border shadow-sm space-y-4">
        <h2 className="text-xl font-bold">שחזור קריטריונים מחוקים</h2>

        {!hasDeletedCriteria ? (
          <p className="text-sm text-muted-foreground">אין קריטריונים מחוקים לשחזור.</p>
        ) : (
          <>
            <select
              value={selectedDeletedCriterionId}
              onChange={(event) => setSelectedDeletedCriterionId(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-full"
            >
              {categories.map((category) => {
                const deletedCriteria = category.criteria.filter((criterion) => !criterion.isActive)
                if (!deletedCriteria.length) return null
                return (
                  <optgroup key={category.id} label={getCategoryLabel(category)}>
                    {deletedCriteria.map((criterion) => (
                      <option key={criterion.id} value={criterion.id}>
                        {criterion.label}
                      </option>
                    ))}
                  </optgroup>
                )
              })}
            </select>

            <div className="flex flex-wrap items-center gap-3">
              <form onSubmit={runAction(restoreCriterion, "הקריטריון שוחזר בהצלחה.")}>
                <input type="hidden" name="criterionId" value={selectedDeletedCriterionId} />
                <Button type="submit" variant="outline" disabled={!selectedDeletedCriterionId || isPending}>
                  שחזר קריטריון
                </Button>
              </form>

              <form
                id={permanentDeleteFormId}
                onSubmit={runAction(permanentlyDeleteCriterion, "הקריטריון נמחק לצמיתות.")}
              >
                <input type="hidden" name="criterionId" value={selectedDeletedCriterionId} />
              </form>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={!canPermanentlyDeleteSelectedDeletedCriterion}
                  >
                    מחק לצמיתות
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent dir="rtl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>מחיקה לצמיתות של הקריטריון</AlertDialogTitle>
                    <AlertDialogDescription>
                      פעולה זו תמחק את הקריטריון לצמיתות ולא תהיה אפשרות לשחזר אותו לאחר מכן.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>ביטול</AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button
                        type="submit"
                        form={permanentDeleteFormId}
                        variant="destructive"
                      >
                        מאשר מחיקה לצמיתות
                      </Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {selectedDeletedCriterion && selectedDeletedCriterion._count.answers > 0 && (
              <p className="text-sm text-muted-foreground">
                לא ניתן למחוק לצמיתות את הקריטריון כי קיימות תשובות היסטוריות המשויכות אליו.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  )
}
