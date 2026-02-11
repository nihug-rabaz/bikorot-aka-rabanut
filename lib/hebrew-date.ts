export function numberToHebrew(num: number): string {
  if (num <= 0) return ""
  const units = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"]
  const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"]
  const hundreds = ["", "ק", "ר", "ש", "ת"]

  let result = ""

  if (num >= 1000) {
    num %= 1000
  }

  const h = Math.floor(num / 100)
  if (h > 4) {
    result += "ת" + numberToHebrew((h - 4) * 100)
  } else {
    result += hundreds[h]
  }
  num %= 100

  if (num === 15) return result + "טו"
  if (num === 16) return result + "טז"

  result += tens[Math.floor(num / 10)]
  result += units[num % 10]

  if (result.length > 1) {
    return result.slice(0, -1) + '"' + result.slice(-1)
  }
  return result
}

export function formatHebrewDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("he-IL-u-ca-hebrew", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(date)

  const dayNum = parseInt(parts.find((p) => p.type === "day")?.value || "0")
  const monthName = parts.find((p) => p.type === "month")?.value || ""
  const yearNum = parseInt(parts.find((p) => p.type === "year")?.value || "0")

  return `${numberToHebrew(dayNum)} ב${monthName} ה${numberToHebrew(yearNum)}`
}

