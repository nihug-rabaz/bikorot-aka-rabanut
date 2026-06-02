"use server"

import { prisma } from "@/lib/prisma"
import { ARCHIVED_CATEGORY_NAME } from "@/lib/form-editor/constants"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { LOG_EVENTS } from "@/lib/logging/events"
import { actorFromSession, writeAppLog } from "@/lib/logging/logger"

const CRITERION_TYPES = new Set(["RADIO", "TEXT", "SCORE"])

type FormEditorActionResult = {
  ok: boolean
  message?: string
  error?: string
}

class FormStructureService {
  private revalidate() {
    revalidatePath("/admin/form-editor")
    revalidatePath("/")
    revalidatePath("/audits")
  }

  private parsePositiveInt(raw: FormDataEntryValue | null, fallback: number) {
    const value = Number.parseInt(String(raw ?? ""), 10)
    if (!Number.isFinite(value) || value < 1) return fallback
    return value
  }

  private normalizeLabel(raw: FormDataEntryValue | null) {
    return String(raw ?? "").trim()
  }

  private normalizeCriterionType(raw: FormDataEntryValue | null) {
    const value = String(raw ?? "").trim().toUpperCase()
    if (CRITERION_TYPES.has(value)) return value
    return "RADIO"
  }

  private async getOrCreateArchivedCategory() {
    const existing = await prisma.category.findFirst({
      where: { name: ARCHIVED_CATEGORY_NAME },
      select: { id: true },
    })
    if (existing) return existing.id

    const lastCategory = await prisma.category.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    })

    const created = await prisma.category.create({
      data: {
        name: ARCHIVED_CATEGORY_NAME,
        order: (lastCategory?.order ?? 0) + 1,
      },
      select: { id: true },
    })

    return created.id
  }

  private async reorderCategoryCriteria(categoryId: string) {
    const activeCriteria = await prisma.criterion.findMany({
      where: { categoryId, isActive: true },
      orderBy: { order: "asc" },
      select: { id: true },
    })

    await prisma.$transaction(
      activeCriteria.map((criterion, index) =>
        prisma.criterion.update({
          where: { id: criterion.id },
          data: { order: index + 1 },
        }),
      ),
    )
  }

  async addCategory(formData: FormData): Promise<FormEditorActionResult> {
    const name = this.normalizeLabel(formData.get("name"))
    if (!name) return { ok: false, error: "יש להזין שם קטגוריה." }

    const lastCategory = await prisma.category.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    })

    await prisma.category.create({
      data: {
        name,
        order: (lastCategory?.order ?? 0) + 1,
      },
    })

    this.revalidate()
    return { ok: true, message: "הקטגוריה נוספה בהצלחה." }
  }

  async renameCategory(formData: FormData): Promise<FormEditorActionResult> {
    const categoryId = String(formData.get("categoryId") ?? "")
    const name = this.normalizeLabel(formData.get("name"))
    if (!categoryId || !name) return { ok: false, error: "לא ניתן לעדכן קטגוריה ללא שם." }

    await prisma.category.update({
      where: { id: categoryId },
      data: { name },
    })

    this.revalidate()
    return { ok: true, message: "שם הקטגוריה עודכן בהצלחה." }
  }

  async moveCategoryWithinList(formData: FormData): Promise<FormEditorActionResult> {
    const categoryId = String(formData.get("categoryId") ?? "")
    if (!categoryId) return { ok: false, error: "לא נבחרה קטגוריה." }

    const categories = await prisma.category.findMany({
      where: { name: { not: ARCHIVED_CATEGORY_NAME } },
      orderBy: { order: "asc" },
      select: { id: true },
    })
    if (!categories.length) return { ok: false, error: "לא נמצאו קטגוריות פעילות." }

    const currentIndex = categories.findIndex((category) => category.id === categoryId)
    if (currentIndex === -1) return { ok: false, error: "הקטגוריה שנבחרה אינה זמינה." }

    const requestedPosition = this.parsePositiveInt(formData.get("position"), currentIndex + 1)
    const clampedPosition = Math.min(Math.max(requestedPosition, 1), categories.length)

    const orderedIds = categories.map((category) => category.id)
    orderedIds.splice(currentIndex, 1)
    orderedIds.splice(clampedPosition - 1, 0, categoryId)

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.category.update({
          where: { id },
          data: { order: index + 1 },
        }),
      ),
    )

    this.revalidate()
    return { ok: true, message: "מיקום הקטגוריה עודכן בהצלחה." }
  }

  async deleteCategory(formData: FormData): Promise<FormEditorActionResult> {
    const categoryId = String(formData.get("categoryId") ?? "")
    if (!categoryId) return { ok: false, error: "לא נבחרה קטגוריה למחיקה." }

    const activeCriteriaCount = await prisma.criterion.count({
      where: { categoryId, isActive: true },
    })
    if (activeCriteriaCount > 0) {
      return {
        ok: false,
        error: "לא ניתן למחוק קטגוריה שיש בה קריטריונים פעילים. יש להסיר את כל הקריטריונים הפעילים ורק לאחר מכן למחוק את הקטגוריה.",
      }
    }

    const inactiveCriteria = await prisma.criterion.findMany({
      where: { categoryId, isActive: false },
      select: { id: true },
    })

    if (inactiveCriteria.length > 0) {
      const archivedCategoryId = await this.getOrCreateArchivedCategory()
      await prisma.$transaction(
        inactiveCriteria.map((criterion) =>
          prisma.criterion.update({
            where: { id: criterion.id },
            data: { categoryId: archivedCategoryId },
          }),
        ),
      )
    }

    await prisma.category.delete({
      where: { id: categoryId },
    })

    const categories = await prisma.category.findMany({
      where: { name: { not: ARCHIVED_CATEGORY_NAME } },
      orderBy: { order: "asc" },
      select: { id: true },
    })
    await prisma.$transaction(
      categories.map((category, index) =>
        prisma.category.update({
          where: { id: category.id },
          data: { order: index + 1 },
        }),
      ),
    )

    this.revalidate()
    return { ok: true, message: "הקטגוריה נמחקה בהצלחה." }
  }

  async addCriterion(formData: FormData): Promise<FormEditorActionResult> {
    const categoryId = String(formData.get("categoryId") ?? "")
    const label = this.normalizeLabel(formData.get("label"))
    const type = this.normalizeCriterionType(formData.get("type"))
    if (!categoryId || !label) return { ok: false, error: "יש לבחור קטגוריה ולהזין מלל קריטריון." }

    const lastCriterion = await prisma.criterion.findFirst({
      where: { categoryId, isActive: true },
      orderBy: { order: "desc" },
      select: { order: true },
    })

    await prisma.criterion.create({
      data: {
        categoryId,
        label,
        type,
        order: (lastCriterion?.order ?? 0) + 1,
        isActive: true,
      },
    })

    this.revalidate()
    return { ok: true, message: "הקריטריון נוסף בהצלחה." }
  }

  async renameCriterion(formData: FormData): Promise<FormEditorActionResult> {
    const criterionId = String(formData.get("criterionId") ?? "")
    const label = this.normalizeLabel(formData.get("label"))
    if (!criterionId || !label) return { ok: false, error: "יש להזין מלל חדש לקריטריון." }

    await prisma.criterion.update({
      where: { id: criterionId },
      data: { label },
    })

    this.revalidate()
    return { ok: true, message: "מלל הקריטריון עודכן בהצלחה." }
  }

  async moveCriterionWithinCategory(formData: FormData): Promise<FormEditorActionResult> {
    const criterionId = String(formData.get("criterionId") ?? "")
    if (!criterionId) return { ok: false, error: "לא נבחר קריטריון." }

    const criterion = await prisma.criterion.findUnique({
      where: { id: criterionId },
      select: { id: true, categoryId: true, isActive: true },
    })
    if (!criterion || !criterion.isActive) return { ok: false, error: "הקריטריון אינו פעיל." }

    const activeCriteria = await prisma.criterion.findMany({
      where: { categoryId: criterion.categoryId, isActive: true },
      orderBy: { order: "asc" },
      select: { id: true },
    })
    if (!activeCriteria.length) return { ok: false, error: "לא נמצאו קריטריונים פעילים בקטגוריה." }

    const currentIndex = activeCriteria.findIndex((item) => item.id === criterion.id)
    if (currentIndex === -1) return { ok: false, error: "הקריטריון לא נמצא בקטגוריה." }

    const requestedPosition = this.parsePositiveInt(formData.get("position"), currentIndex + 1)
    const clampedPosition = Math.min(Math.max(requestedPosition, 1), activeCriteria.length)

    const orderedIds = activeCriteria.map((item) => item.id)
    orderedIds.splice(currentIndex, 1)
    orderedIds.splice(clampedPosition - 1, 0, criterion.id)

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.criterion.update({
          where: { id },
          data: { order: index + 1 },
        }),
      ),
    )

    this.revalidate()
    return { ok: true, message: "מיקום הקריטריון עודכן בהצלחה." }
  }

  async moveCriterionToCategory(formData: FormData): Promise<FormEditorActionResult> {
    const criterionId = String(formData.get("criterionId") ?? "")
    const targetCategoryId = String(formData.get("targetCategoryId") ?? "")
    if (!criterionId || !targetCategoryId) return { ok: false, error: "יש לבחור קריטריון וקטגוריית יעד." }

    const criterion = await prisma.criterion.findUnique({
      where: { id: criterionId },
      select: { id: true, categoryId: true, isActive: true },
    })
    if (!criterion || !criterion.isActive) return { ok: false, error: "הקריטריון אינו פעיל." }

    if (criterion.categoryId === targetCategoryId) {
      const sameCategoryFormData = new FormData()
      sameCategoryFormData.set("criterionId", criterionId)
      sameCategoryFormData.set(
        "position",
        String(this.parsePositiveInt(formData.get("targetPosition"), 1)),
      )
      return this.moveCriterionWithinCategory(sameCategoryFormData)
    }

    const sourceCriteria = await prisma.criterion.findMany({
      where: { categoryId: criterion.categoryId, isActive: true },
      orderBy: { order: "asc" },
      select: { id: true },
    })
    const targetCriteria = await prisma.criterion.findMany({
      where: { categoryId: targetCategoryId, isActive: true },
      orderBy: { order: "asc" },
      select: { id: true },
    })

    const requestedPosition = this.parsePositiveInt(formData.get("targetPosition"), targetCriteria.length + 1)
    const clampedPosition = Math.min(Math.max(requestedPosition, 1), targetCriteria.length + 1)

    const sourceOrderedIds = sourceCriteria
      .map((item) => item.id)
      .filter((id) => id !== criterion.id)
    const targetOrderedIds = targetCriteria.map((item) => item.id)
    targetOrderedIds.splice(clampedPosition - 1, 0, criterion.id)

    await prisma.$transaction(async (tx) => {
      await tx.criterion.update({
        where: { id: criterion.id },
        data: { categoryId: targetCategoryId },
      })

      for (const [index, id] of sourceOrderedIds.entries()) {
        await tx.criterion.update({
          where: { id },
          data: { order: index + 1 },
        })
      }

      for (const [index, id] of targetOrderedIds.entries()) {
        await tx.criterion.update({
          where: { id },
          data: { order: index + 1 },
        })
      }
    })

    this.revalidate()
    return { ok: true, message: "הקריטריון הועבר בהצלחה." }
  }

  async softDeleteCriterion(formData: FormData): Promise<FormEditorActionResult> {
    const criterionId = String(formData.get("criterionId") ?? "")
    if (!criterionId) return { ok: false, error: "לא נבחר קריטריון להסרה." }

    const criterion = await prisma.criterion.findUnique({
      where: { id: criterionId },
      select: { categoryId: true, isActive: true },
    })
    if (!criterion || !criterion.isActive) return { ok: false, error: "הקריטריון כבר הוסר." }

    await prisma.criterion.update({
      where: { id: criterionId },
      data: { isActive: false },
    })

    await this.reorderCategoryCriteria(criterion.categoryId)
    this.revalidate()
    return { ok: true, message: "הקריטריון הוסר בהצלחה." }
  }

  async restoreCriterion(formData: FormData): Promise<FormEditorActionResult> {
    const criterionId = String(formData.get("criterionId") ?? "")
    if (!criterionId) return { ok: false, error: "לא נבחר קריטריון לשחזור." }

    const criterion = await prisma.criterion.findUnique({
      where: { id: criterionId },
      select: { categoryId: true, isActive: true },
    })
    if (!criterion || criterion.isActive) return { ok: false, error: "לא ניתן לשחזר את הקריטריון." }

    const lastCriterion = await prisma.criterion.findFirst({
      where: { categoryId: criterion.categoryId, isActive: true },
      orderBy: { order: "desc" },
      select: { order: true },
    })

    await prisma.criterion.update({
      where: { id: criterionId },
      data: {
        isActive: true,
        order: (lastCriterion?.order ?? 0) + 1,
      },
    })

    this.revalidate()
    return { ok: true, message: "הקריטריון שוחזר בהצלחה." }
  }

  async permanentlyDeleteCriterion(formData: FormData): Promise<FormEditorActionResult> {
    const criterionId = String(formData.get("criterionId") ?? "")
    if (!criterionId) return { ok: false, error: "לא נבחר קריטריון למחיקה לצמיתות." }

    const criterion = await prisma.criterion.findUnique({
      where: { id: criterionId },
      select: {
        id: true,
        categoryId: true,
        isActive: true,
        _count: {
          select: { answers: true },
        },
      },
    })
    if (!criterion) return { ok: false, error: "הקריטריון לא נמצא." }
    if (criterion.isActive) return { ok: false, error: "ניתן למחוק לצמיתות רק קריטריון שהוסר." }
    if (criterion._count.answers > 0) {
      return { ok: false, error: "לא ניתן למחוק לצמיתות קריטריון שיש לו תשובות היסטוריות." }
    }

    await prisma.criterion.delete({
      where: { id: criterion.id },
    })

    await this.reorderCategoryCriteria(criterion.categoryId)
    this.revalidate()
    return { ok: true, message: "הקריטריון נמחק לצמיתות." }
  }
}

const service = new FormStructureService()

async function logFormEditorResult(params: {
  formData: FormData
  sourceAction: string
  successEvent: string
  failureEvent: string
  blockedEvent?: string
  result: FormEditorActionResult
  entityType: string
  entityIdField?: string
}) {
  const session = await getServerSession(authOptions)
  const actor = actorFromSession(session)
  const entityId = params.entityIdField ? String(params.formData.get(params.entityIdField) ?? "") : undefined
  const blockedPatterns = ["לא ניתן למחוק קטגוריה", "לא ניתן למחוק לצמיתות קריטריון"]
  const isBlocked =
    !!params.blockedEvent &&
    !!params.result.error &&
    blockedPatterns.some((pattern) => params.result.error?.includes(pattern))

  await writeAppLog({
    level: params.result.ok ? "INFO" : isBlocked ? "WARN" : "ERROR",
    eventType: params.result.ok
      ? params.successEvent
      : isBlocked
        ? (params.blockedEvent as string)
        : params.failureEvent,
    status: params.result.ok ? "SUCCESS" : isBlocked ? "BLOCKED" : "FAIL",
    source: "admin.form-editor",
    action: params.sourceAction,
    message: params.result.ok ? params.result.message : params.result.error,
    actor,
    entityType: params.entityType,
    entityId,
  })
}

export async function addCategory(formData: FormData) {
  const result = await service.addCategory(formData)
  await logFormEditorResult({
    formData,
    sourceAction: "Create category",
    successEvent: LOG_EVENTS.adminFormCategoryCreateSuccess,
    failureEvent: LOG_EVENTS.adminFormCategoryCreateFailure,
    result,
    entityType: "category",
  })
  return result
}

export async function renameCategory(formData: FormData) {
  const result = await service.renameCategory(formData)
  await logFormEditorResult({
    formData,
    sourceAction: "Rename category",
    successEvent: LOG_EVENTS.adminFormCategoryUpdateSuccess,
    failureEvent: LOG_EVENTS.adminFormCategoryUpdateFailure,
    result,
    entityType: "category",
    entityIdField: "categoryId",
  })
  return result
}

export async function moveCategoryWithinList(formData: FormData) {
  const result = await service.moveCategoryWithinList(formData)
  await logFormEditorResult({
    formData,
    sourceAction: "Reorder category",
    successEvent: LOG_EVENTS.adminFormCategoryReorderSuccess,
    failureEvent: LOG_EVENTS.adminFormCategoryReorderFailure,
    result,
    entityType: "category",
    entityIdField: "categoryId",
  })
  return result
}

export async function deleteCategory(formData: FormData) {
  const result = await service.deleteCategory(formData)
  await logFormEditorResult({
    formData,
    sourceAction: "Delete category",
    successEvent: LOG_EVENTS.adminFormCategoryDeleteSuccess,
    failureEvent: LOG_EVENTS.adminFormCategoryDeleteFailure,
    blockedEvent: result.ok ? undefined : LOG_EVENTS.adminFormCategoryDeleteBlockedActiveCriteria,
    result,
    entityType: "category",
    entityIdField: "categoryId",
  })
  return result
}

export async function addCriterion(formData: FormData) {
  const result = await service.addCriterion(formData)
  await logFormEditorResult({
    formData,
    sourceAction: "Create criterion",
    successEvent: LOG_EVENTS.adminFormCriterionCreateSuccess,
    failureEvent: LOG_EVENTS.adminFormCriterionCreateFailure,
    result,
    entityType: "criterion",
  })
  return result
}

export async function renameCriterion(formData: FormData) {
  const result = await service.renameCriterion(formData)
  await logFormEditorResult({
    formData,
    sourceAction: "Rename criterion",
    successEvent: LOG_EVENTS.adminFormCriterionUpdateSuccess,
    failureEvent: LOG_EVENTS.adminFormCriterionUpdateFailure,
    result,
    entityType: "criterion",
    entityIdField: "criterionId",
  })
  return result
}

export async function moveCriterionWithinCategory(formData: FormData) {
  const result = await service.moveCriterionWithinCategory(formData)
  await logFormEditorResult({
    formData,
    sourceAction: "Reorder criterion",
    successEvent: LOG_EVENTS.adminFormCriterionReorderSuccess,
    failureEvent: LOG_EVENTS.adminFormCriterionReorderFailure,
    result,
    entityType: "criterion",
    entityIdField: "criterionId",
  })
  return result
}

export async function moveCriterionToCategory(formData: FormData) {
  const result = await service.moveCriterionToCategory(formData)
  await logFormEditorResult({
    formData,
    sourceAction: "Move criterion",
    successEvent: LOG_EVENTS.adminFormCriterionMoveSuccess,
    failureEvent: LOG_EVENTS.adminFormCriterionMoveFailure,
    result,
    entityType: "criterion",
    entityIdField: "criterionId",
  })
  return result
}

export async function softDeleteCriterion(formData: FormData) {
  const result = await service.softDeleteCriterion(formData)
  await logFormEditorResult({
    formData,
    sourceAction: "Soft remove criterion",
    successEvent: LOG_EVENTS.adminFormCriterionSoftRemoveSuccess,
    failureEvent: LOG_EVENTS.adminFormCriterionSoftRemoveFailure,
    result,
    entityType: "criterion",
    entityIdField: "criterionId",
  })
  return result
}

export async function restoreCriterion(formData: FormData) {
  const result = await service.restoreCriterion(formData)
  await logFormEditorResult({
    formData,
    sourceAction: "Restore criterion",
    successEvent: LOG_EVENTS.adminFormCriterionRestoreSuccess,
    failureEvent: LOG_EVENTS.adminFormCriterionRestoreFailure,
    result,
    entityType: "criterion",
    entityIdField: "criterionId",
  })
  return result
}

export async function permanentlyDeleteCriterion(formData: FormData) {
  const result = await service.permanentlyDeleteCriterion(formData)
  await logFormEditorResult({
    formData,
    sourceAction: "Hard delete criterion",
    successEvent: LOG_EVENTS.adminFormCriterionHardDeleteSuccess,
    failureEvent: LOG_EVENTS.adminFormCriterionHardDeleteFailure,
    blockedEvent: result.ok ? undefined : LOG_EVENTS.adminFormCriterionHardDeleteBlockedHasAnswers,
    result,
    entityType: "criterion",
    entityIdField: "criterionId",
  })
  return result
}
