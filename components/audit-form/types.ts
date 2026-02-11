export type AuditStatus = "תקין" | "לא תקין" | "לא רלוונטי" | null

export type ScoreValue = "תקין" | "תקין גבולי" | "לא תקין" | null

export interface ChecklistItem {
  id: string
  label: string
  status: AuditStatus
  comment: string
}

export interface CriterionFromDb {
  id: string
  label: string
  type: string
}

export interface CategoryWithCriteria {
  id: string
  name: string
  order: number
  criteria: CriterionFromDb[]
}

export interface InspectorOption {
  id: string
  name: string
}

export interface GeneralDetails {
  date: string
  unitName: string
  rabbiName: string
  rabbiRank: string
  rabbiSeniority: number
  rabbiIdNumber: string
  ncoName: string
  ncoRank: string
  ncoSeniority: number
  ncoIdNumber: string
}

export type AuditSectionKey =
  | "halacha"
  | "kashrut"
  | "emergency"
  | "raotTodi"
  | "equipment"
  | "personnel"

export interface AnswerEntry {
  value?: string | null
  comment?: string | null
}

export type AnswersByCriterionId = Record<string, AnswerEntry>

export interface AuditData {
  generalDetails: GeneralDetails
  halacha: ChecklistItem[]
  kashrut: ChecklistItem[]
  emergency: ChecklistItem[]
  raotTodi: ChecklistItem[]
  equipment: ChecklistItem[]
  personnel: ChecklistItem[]
  crossTalk: string
  summary: string
}
