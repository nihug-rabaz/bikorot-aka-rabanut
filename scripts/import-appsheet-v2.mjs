import { readFile, writeFile } from "node:fs/promises"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as dotenv from "dotenv"
import pg from "pg"

dotenv.config()

const GENERAL_COLUMNS = new Set([
  "ID",
  "מבקר",
  "מבקרים משותפים",
  "תאריך ביקורת",
  "שם יחידה",
  "שם רב מבוקר",
  "וותק רב מבוקר",
  "מספר אישי רב מבוקר",
  "שם נגד/אזרח מכ\"ש",
  "וותק מכ\"ש",
  "מספר אישי מכ\"ש",
  "הערכת מבקר",
  "המלצות מבקר",
  "ציון",
])

const IGNORED_COLUMNS = new Set([
  "Start time",
  "Completion time",
  "תצוגה1",
  "תצוגה2",
  "תצוגה3",
  "הלכה",
  "כשרות",
  "_חירום",
  "Column_78",
  "_רעו\"ת ותוד\"י",
  "Column_82",
  "ציוד ומחסנים",
  "Column_88",
  "_כ\"א",
  "Column_92",
  "סיכום",
  "Doc",
  "file",
  "process_file_count",
  "process_file_started_at",
  "variables",
  "שם מבקר",
  "שמות מבקרים",
])

const MANUAL_CRITERION_LABELS = new Map([
  ["בית כנסת", "בית כנסת + עזרת נשים"],
  ["ספרי_תורה_מספר_צבאי", "ספרי תורה + מספר צבאי"],
  ["פיקוח עבודה ובקרת כשרות", "פיקוח עבודות ובקרת כשרות"],
  ["תיק תאח", "תיק תא\"ח"],
  ["ערכת זהב", "ערכת זה\"ב"],
  ["תרגול שבועי ערכת זהב", "תרגול שבועי ערכת זה\"ב"],
  ["טופס_246_חדש", "האם הטופס 246 הוא הטופס החדש"],
  ["שת_פ חינוך רבנות", "שת\"פ חינוך רבנות"],
  ["כא", "כ\"א"],
  ["תקינת_נגד", "האם תקינת הנגד תואמת את הנחיות רבצ\"ר"],
  ["שיחת חתך חיילים", "כתוב נקודות שעלו בשיחת חתך עם החיילים מומלץ למספר"],
  ["ליווי_מתגיירים", "ליווי מתגיירים"],
])

const RANKS = [
  "אל\"ם",
  "סא\"ל",
  "רס\"ן",
  "סרן",
  "סג\"ם",
  "רס\"ב",
  "רס\"מ",
  "רס\"ר",
  "רס\"ל",
  "סמ\"ר",
  "סמל",
  "רב\"ט",
  "טוראי",
  "אע\"צ",
  "אזרח",
]

class CsvParser {
  parse(content) {
    const rows = []
    let row = []
    let value = ""
    let inQuotes = false

    for (let i = 0; i < content.length; i += 1) {
      const char = content[i]
      const next = content[i + 1]

      if (char === "\"") {
        if (inQuotes && next === "\"") {
          value += "\""
          i += 1
          continue
        }
        inQuotes = !inQuotes
        continue
      }

      if (char === "," && !inQuotes) {
        row.push(value)
        value = ""
        continue
      }

      if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") i += 1
        row.push(value)
        rows.push(row)
        row = []
        value = ""
        continue
      }

      value += char
    }

    if (value.length > 0 || row.length > 0) {
      row.push(value)
      rows.push(row)
    }

    return rows.filter((line) => line.some((cell) => this.clean(cell)))
  }

  toObjects(rows) {
    const headers = rows[0].map((header) => this.clean(header).replace(/^\uFEFF/, ""))
    return rows.slice(1).map((row, index) => {
      const record = { __rowNumber: index + 2 }
      headers.forEach((header, columnIndex) => {
        record[header] = this.clean(row[columnIndex] ?? "")
      })
      return record
    })
  }

  clean(value) {
    return String(value ?? "").trim()
  }
}

class TextNormalizer {
  normalize(value) {
    return String(value ?? "")
      .replace(/^\uFEFF/, "")
      .replace(/_/g, " ")
      .replace(/[״“”]/g, "\"")
      .replace(/[׳‘’]/g, "'")
      .replace(/\s+/g, " ")
      .trim()
  }

  compact(value) {
    return this.normalize(value).replace(/["' +]/g, "")
  }
}

class ImportReporter {
  constructor() {
    this.errors = new Map()
    this.warnings = new Map()
    this.valueSamples = new Map()
    this.info = new Map()
  }

  addInfo(type, value) {
    if (!value) return
    this.add(this.info, type, value)
  }

  addError(type, value) {
    if (!value) return
    this.add(this.errors, type, value)
  }

  addWarning(type, value) {
    if (!value) return
    this.add(this.warnings, type, value)
  }

  addValueSample(type, value) {
    if (!value) return
    this.add(this.valueSamples, type, value)
  }

  hasErrors() {
    return this.errors.size > 0
  }

  build(summary) {
    const lines = [JSON.stringify(summary, null, 2)]
    this.appendGroup(lines, "ERRORS", this.errors)
    this.appendGroup(lines, "WARNINGS", this.warnings)
    this.appendGroup(lines, "VALUE_SAMPLES", this.valueSamples)
    this.appendGroup(lines, "INFO", this.info)
    return lines.join("\n")
  }

  add(target, type, value) {
    if (!target.has(type)) target.set(type, new Set())
    target.get(type).add(value)
  }

  appendGroup(lines, title, group) {
    if (!group.size) return
    lines.push(`\n${title}`)
    for (const [type, values] of group.entries()) {
      lines.push(`- ${type} (${values.size})`)
      for (const value of values) {
        lines.push(`  ${value}`)
      }
    }
  }
}

class CriterionMapper {
  constructor(criteria, normalizer, reporter) {
    this.criteria = criteria
    this.normalizer = normalizer
    this.reporter = reporter
    this.byLabel = new Map()
    this.byNormalizedLabel = new Map()
    this.byCompactLabel = new Map()

    for (const criterion of criteria) {
      this.byLabel.set(criterion.label, criterion)
      this.byNormalizedLabel.set(this.normalizer.normalize(criterion.label), criterion)
      this.byCompactLabel.set(this.normalizer.compact(criterion.label), criterion)
    }
  }

  buildSpecs(headers) {
    const specs = []
    const usedCommentHeaders = new Set()

    for (let index = 0; index < headers.length; index += 1) {
      const header = headers[index]
      const criterion = this.findCriterion(header)
      if (!criterion) {
        this.reportUnmappedColumn(header)
        continue
      }

      const nextHeader = headers[index + 1]
      const commentHeader = this.isCommentHeader(nextHeader) ? nextHeader : null
      if (commentHeader) usedCommentHeaders.add(commentHeader)
      specs.push({ header, commentHeader, criterion })
    }

    return specs.filter((spec) => !usedCommentHeaders.has(spec.header))
  }

  findCriterion(header) {
    const target = MANUAL_CRITERION_LABELS.get(header) ?? header
    return (
      this.byLabel.get(target) ??
      this.byNormalizedLabel.get(this.normalizer.normalize(target)) ??
      this.byCompactLabel.get(this.normalizer.compact(target)) ??
      null
    )
  }

  reportUnmappedColumn(header) {
    if (!header || this.isIgnoredColumn(header) || this.isCommentHeader(header)) return
    this.reporter.addError("unmapped_column", header)
  }

  isCommentHeader(header) {
    return /^הערה/.test(header ?? "")
  }

  isIgnoredColumn(header) {
    return GENERAL_COLUMNS.has(header) || IGNORED_COLUMNS.has(header) || /^Column_\d+$/.test(header)
  }
}

class InspectorResolver {
  constructor(inspectors, reporter) {
    this.reporter = reporter
    this.byEmail = new Map()

    for (const inspector of inspectors) {
      if (inspector.email) this.byEmail.set(inspector.email.toLowerCase(), inspector)
    }
  }

  resolveCreator(row) {
    const email = row["מבקר"]?.toLowerCase()
    if (!email) return null
    const inspector = this.byEmail.get(email)
    if (!inspector) this.reporter.addError("missing_creator_email", `${row.__rowNumber}: ${email}`)
    return inspector ?? null
  }
}

class AuditBuilder {
  constructor(criteriaSpecs, inspectorResolver, reporter) {
    this.criteriaSpecs = criteriaSpecs
    this.inspectorResolver = inspectorResolver
    this.reporter = reporter
  }

  build(row) {
    const creator = this.inspectorResolver.resolveCreator(row)
    const inspectors = creator ? [creator] : []
    const rabbi = this.splitRankAndName(row["שם רב מבוקר"])
    const nco = this.splitRankAndName(row["שם נגד/אזרח מכ\"ש"])

    return {
      externalId: row.ID,
      data: {
        date: this.parseDate(row["תאריך ביקורת"], row.__rowNumber),
        unitName: row["שם יחידה"] || "",
        rabbiName: rabbi.name,
        rabbiRank: rabbi.rank,
        rabbiSeniority: this.parseInt(row["וותק רב מבוקר"]),
        rabbiIdNumber: row["מספר אישי רב מבוקר"] || "",
        ncoName: nco.name,
        ncoRank: nco.rank,
        ncoSeniority: this.parseInt(row["וותק מכ\"ש"]),
        ncoIdNumber: row["מספר אישי מכ\"ש"] || "",
        summaryEvaluation: row["הערכת מבקר"] || null,
        recommendations: row["המלצות מבקר"] || null,
        finalScore: row["ציון"] || null,
        status: "DRAFT",
      },
      creatorId: creator?.id ?? null,
      inspectorIds: inspectors.map((inspector) => inspector.id),
      answers: this.buildAnswers(row),
    }
  }

  buildAnswers(row) {
    const answers = []
    for (const spec of this.criteriaSpecs) {
      const value = this.normalizeValue(row[spec.header])
      const comment = spec.commentHeader ? row[spec.commentHeader] || null : null
      if (!value && !comment) continue
      this.validateValue(row, spec, value)
      answers.push({ criterionId: spec.criterion.id, value, comment })
    }
    return answers
  }

  validateValue(row, spec, value) {
    if (!value) return
    if (spec.criterion.type === "RADIO" && !["תקין", "לא תקין", "לא רלוונטי"].includes(value)) {
      this.reporter.addError("unknown_radio_value", `${row.__rowNumber}: ${spec.header} = ${value}`)
    }
    if (spec.criterion.type === "SCORE" && !["תקין", "תקין גבולי", "לא תקין"].includes(value)) {
      this.reporter.addError("unknown_score_value", `${row.__rowNumber}: ${spec.header} = ${value}`)
    }
    if (spec.criterion.type === "RADIO" || spec.criterion.type === "SCORE") {
      this.reporter.addValueSample(spec.criterion.type, value)
    }
  }

  normalizeValue(value) {
    const trimmed = String(value ?? "").trim()
    if (!trimmed) return null
    if (trimmed === "ל\"ר" || trimmed === "לר") return "לא רלוונטי"
    if (trimmed === "מתוקנן" || trimmed === "מתקיים" || trimmed === "כן") return "תקין"
    if (trimmed === "לא מתוקנן" || trimmed === "לא מתקיים" || trimmed === "לא") return "לא תקין"
    return trimmed
  }

  parseDate(value, rowNumber) {
    const text = String(value ?? "").trim()
    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (!match) {
      this.reporter.addError("invalid_date", `${rowNumber}: ${text}`)
      return new Date()
    }
    const [, day, month, year] = match
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  parseInt(value) {
    const parsed = Number.parseInt(String(value ?? "").trim(), 10)
    return Number.isFinite(parsed) ? parsed : 0
  }

  splitRankAndName(value) {
    const text = String(value ?? "").trim()
    const rank = RANKS.find((candidate) => text.startsWith(`${candidate} `))
    if (!rank) return { rank: "", name: text }
    return { rank, name: text.slice(rank.length).trim() }
  }
}

class AppSheetV2Importer {
  constructor(prisma, options) {
    this.prisma = prisma
    this.options = options
    this.reporter = new ImportReporter()
    this.normalizer = new TextNormalizer()
  }

  async run() {
    const records = await this.loadRecords()
    const criteria = await this.prisma.criterion.findMany()
    const inspectors = await this.prisma.inspector.findMany()
    const headers = Object.keys(records[0] ?? {}).filter((header) => header !== "__rowNumber")
    const criteriaSpecs = new CriterionMapper(criteria, this.normalizer, this.reporter).buildSpecs(headers)
    const builder = new AuditBuilder(criteriaSpecs, new InspectorResolver(inspectors, this.reporter), this.reporter)
    const audits = records.map((row) => this.buildAudit(row, builder)).filter(Boolean)

    this.validateExternalIds(audits)
    this.dumpDbCriteriaIfUnmapped(criteria)
    await this.printReport(records, audits, criteriaSpecs)
    if (this.options.dryRun) return
    if (this.reporter.hasErrors()) throw new Error("Import aborted because validation errors were found.")
    await this.write(audits)
  }

  async loadRecords() {
    const content = await readFile(this.options.file, "utf8")
    const parser = new CsvParser()
    const rows = parser.parse(content)
    if (rows.length < 2) throw new Error("CSV file has no data rows.")
    return parser.toObjects(rows)
  }

  buildAudit(row, builder) {
    if (!row.ID) {
      this.reporter.addError("missing_external_id", `${row.__rowNumber}`)
      return null
    }
    return builder.build(row)
  }

  validateExternalIds(audits) {
    const seen = new Set()
    for (const audit of audits) {
      if (seen.has(audit.externalId)) this.reporter.addError("duplicate_external_id_in_csv", audit.externalId)
      seen.add(audit.externalId)
    }
  }

  dumpDbCriteriaIfUnmapped(criteria) {
    if (!this.reporter.errors.has("unmapped_column")) return
    for (const criterion of criteria) {
      const flag = criterion.isActive ? "active" : "inactive"
      this.reporter.addInfo("db_criterion", `${criterion.label} [${criterion.type}/${flag}]`)
    }
  }

  async printReport(records, audits, criteriaSpecs) {
    const report = this.reporter.build({
      mode: this.options.dryRun ? "dry-run" : "write",
      rows: records.length,
      auditsReady: audits.length,
      criteriaColumns: criteriaSpecs.length,
      answersReady: audits.reduce((total, audit) => total + audit.answers.length, 0),
      hasErrors: this.reporter.hasErrors(),
      canWrite: !this.options.dryRun && !this.reporter.hasErrors(),
    })
    console.log(report)
    await writeFile("import-report.txt", report, "utf8")
    console.log("\nFull report written to import-report.txt")
  }

  async write(audits) {
    for (const audit of audits) {
      await this.prisma.$transaction(async (tx) => {
        const savedAudit = await tx.audit.upsert({
          where: { externalId: audit.externalId },
          create: {
            externalId: audit.externalId,
            ...audit.data,
            ...(audit.creatorId ? { creator: { connect: { id: audit.creatorId } } } : {}),
            ...(audit.inspectorIds.length ? { inspectors: { connect: audit.inspectorIds.map((id) => ({ id })) } } : {}),
          },
          update: {
            ...audit.data,
            ...(audit.creatorId ? { creator: { connect: { id: audit.creatorId } } } : {}),
            inspectors: { set: audit.inspectorIds.map((id) => ({ id })) },
          },
        })

        for (const answer of audit.answers) {
          await tx.answer.upsert({
            where: {
              auditId_criterionId: {
                auditId: savedAudit.id,
                criterionId: answer.criterionId,
              },
            },
            create: {
              auditId: savedAudit.id,
              criterionId: answer.criterionId,
              value: answer.value,
              comment: answer.comment,
            },
            update: {
              value: answer.value,
              comment: answer.comment,
            },
          })
        }
      })
    }

    console.log(`Imported ${audits.length} audits.`)
  }
}

class CliOptions {
  static parse(argv) {
    const args = new Map()
    for (let i = 0; i < argv.length; i += 1) {
      const arg = argv[i]
      if (!arg.startsWith("--")) continue
      if (arg === "--write") {
        args.set("write", true)
        continue
      }
      args.set(arg.slice(2), argv[i + 1])
      i += 1
    }

    const file = args.get("file")
    if (!file) throw new Error("Usage: node scripts/import-appsheet-v2.mjs --file <csv-path> [--write]")
    return { file, dryRun: !args.get("write") }
  }
}

const options = CliOptions.parse(process.argv.slice(2))
const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error("DATABASE_URL is missing.")

const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

try {
  await new AppSheetV2Importer(prisma, options).run()
} finally {
  await prisma.$disconnect()
  await pool.end()
}
