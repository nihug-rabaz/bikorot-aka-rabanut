"use client"

type LogData = Record<string, unknown>

export function navLog(scope: string, message: string, data?: LogData) {
  if (process.env.NODE_ENV !== "development") return
  if (data) {
    console.log(`[${scope}] ${message}`, data)
    return
  }
  console.log(`[${scope}] ${message}`)
}
