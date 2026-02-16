"use client"

import Dexie, { Table } from "dexie"

export interface OfflineAuditRecord {
  id: string
  generalDetailsJson: string
  selectedInspectorIdsJson: string
  updatedAt: string
  isDirty: number
  lastSyncedAt?: string | null
}

export interface OfflineAnswerRecord {
  id: string
  auditId: string
  criterionId: string
  value: string | null
  comment: string | null
  updatedAt: string
  isDirty: number
  lastSyncedAt?: string | null
}

class OfflineDb extends Dexie {
  audits!: Table<OfflineAuditRecord, string>
  answers!: Table<OfflineAnswerRecord, string>

  constructor() {
    super("BikorotOfflineDb")
    this.version(1).stores({
      audits: "id, updatedAt",
      answers: "id, auditId, criterionId, updatedAt",
    })
    this.version(2).stores({
      audits: "id, updatedAt, isDirty",
      answers: "id, auditId, criterionId, updatedAt, isDirty",
    })
    this.version(3)
      .stores({
        audits: "id, isDirty, updatedAt",
        answers: "id, auditId, criterionId, isDirty, updatedAt",
      })
      .upgrade((tx) => {
        tx.table("audits").clear()
        tx.table("answers").clear()
    })
  }
}

export const offlineDb = new OfflineDb()

