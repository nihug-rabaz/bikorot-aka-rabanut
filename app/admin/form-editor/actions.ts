"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

const CRITERION_TYPES = new Set(["RADIO", "TEXT", "SCORE"])

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

  async addCategory(formData: FormData) {
    const name = this.normalizeLabel(formData.get("name"))
    if (!name) return

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
  }

  async renameCategory(formData: FormData) {
    const categoryId = String(formData.get("categoryId") ?? "")
    const name = this.normalizeLabel(formData.get("name"))
    if (!categoryId || !name) return

    await prisma.category.update({
      where: { id: categoryId },
      data: { name },
    })

    this.revalidate()
  }

  async moveCategoryWithinList(formData: FormData) {
    const categoryId = String(formData.get("categoryId") ?? "")
    if (!categoryId) return

    const categories = await prisma.category.findMany({
      orderBy: { order: "asc" },
      select: { id: true },
    })
    if (!categories.length) return

    const currentIndex = categories.findIndex((category) => category.id === categoryId)
    if (currentIndex === -1) return

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
  }

  async deleteCategory(formData: FormData) {
    const categoryId = String(formData.get("categoryId") ?? "")
    if (!categoryId) return

    const criteriaCount = await prisma.criterion.count({
      where: { categoryId },
    })
    if (criteriaCount > 0) return

    await prisma.category.delete({
      where: { id: categoryId },
    })

    const categories = await prisma.category.findMany({
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
  }

  async addCriterion(formData: FormData) {
    const categoryId = String(formData.get("categoryId") ?? "")
    const label = this.normalizeLabel(formData.get("label"))
    const type = this.normalizeCriterionType(formData.get("type"))
    if (!categoryId || !label) return

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
  }

  async renameCriterion(formData: FormData) {
    const criterionId = String(formData.get("criterionId") ?? "")
    const label = this.normalizeLabel(formData.get("label"))
    if (!criterionId || !label) return

    await prisma.criterion.update({
      where: { id: criterionId },
      data: { label },
    })

    this.revalidate()
  }

  async moveCriterionWithinCategory(formData: FormData) {
    const criterionId = String(formData.get("criterionId") ?? "")
    if (!criterionId) return

    const criterion = await prisma.criterion.findUnique({
      where: { id: criterionId },
      select: { id: true, categoryId: true, isActive: true },
    })
    if (!criterion || !criterion.isActive) return

    const activeCriteria = await prisma.criterion.findMany({
      where: { categoryId: criterion.categoryId, isActive: true },
      orderBy: { order: "asc" },
      select: { id: true },
    })
    if (!activeCriteria.length) return

    const currentIndex = activeCriteria.findIndex((item) => item.id === criterion.id)
    if (currentIndex === -1) return

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
  }

  async moveCriterionToCategory(formData: FormData) {
    const criterionId = String(formData.get("criterionId") ?? "")
    const targetCategoryId = String(formData.get("targetCategoryId") ?? "")
    if (!criterionId || !targetCategoryId) return

    const criterion = await prisma.criterion.findUnique({
      where: { id: criterionId },
      select: { id: true, categoryId: true, isActive: true },
    })
    if (!criterion || !criterion.isActive) return

    if (criterion.categoryId === targetCategoryId) {
      const sameCategoryFormData = new FormData()
      sameCategoryFormData.set("criterionId", criterionId)
      sameCategoryFormData.set(
        "position",
        String(this.parsePositiveInt(formData.get("targetPosition"), 1)),
      )
      await this.moveCriterionWithinCategory(sameCategoryFormData)
      return
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
  }

  async softDeleteCriterion(formData: FormData) {
    const criterionId = String(formData.get("criterionId") ?? "")
    if (!criterionId) return

    const criterion = await prisma.criterion.findUnique({
      where: { id: criterionId },
      select: { categoryId: true, isActive: true },
    })
    if (!criterion || !criterion.isActive) return

    await prisma.criterion.update({
      where: { id: criterionId },
      data: { isActive: false },
    })

    await this.reorderCategoryCriteria(criterion.categoryId)
    this.revalidate()
  }

  async restoreCriterion(formData: FormData) {
    const criterionId = String(formData.get("criterionId") ?? "")
    if (!criterionId) return

    const criterion = await prisma.criterion.findUnique({
      where: { id: criterionId },
      select: { categoryId: true, isActive: true },
    })
    if (!criterion || criterion.isActive) return

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
  }

  async permanentlyDeleteCriterion(formData: FormData) {
    const criterionId = String(formData.get("criterionId") ?? "")
    if (!criterionId) return

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
    if (!criterion) return
    if (criterion.isActive) return
    if (criterion._count.answers > 0) return

    await prisma.criterion.delete({
      where: { id: criterion.id },
    })

    await this.reorderCategoryCriteria(criterion.categoryId)
    this.revalidate()
  }
}

const service = new FormStructureService()

export async function addCategory(formData: FormData) {
  return service.addCategory(formData)
}

export async function renameCategory(formData: FormData) {
  return service.renameCategory(formData)
}

export async function moveCategoryWithinList(formData: FormData) {
  return service.moveCategoryWithinList(formData)
}

export async function deleteCategory(formData: FormData) {
  return service.deleteCategory(formData)
}

export async function addCriterion(formData: FormData) {
  return service.addCriterion(formData)
}

export async function renameCriterion(formData: FormData) {
  return service.renameCriterion(formData)
}

export async function moveCriterionWithinCategory(formData: FormData) {
  return service.moveCriterionWithinCategory(formData)
}

export async function moveCriterionToCategory(formData: FormData) {
  return service.moveCriterionToCategory(formData)
}

export async function softDeleteCriterion(formData: FormData) {
  return service.softDeleteCriterion(formData)
}

export async function restoreCriterion(formData: FormData) {
  return service.restoreCriterion(formData)
}

export async function permanentlyDeleteCriterion(formData: FormData) {
  return service.permanentlyDeleteCriterion(formData)
}
