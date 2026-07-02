import type { ScanResult } from '@/engine/types'

export interface HistoryEntry {
  url: string
  score: number
  totalIssues: number
  errors: number
  warnings: number
  infos: number
  scannedAt: string
}

const STORAGE_KEY = 'a11y-history'
const LAST_RESULT_KEY = 'a11y-last-result'
const MAX_ENTRIES = 10

export function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.slice(0, MAX_ENTRIES)
  } catch {
    return []
  }
}

export function addToHistory(result: ScanResult): HistoryEntry[] {
  const history = getHistory()

  // Remove duplicate entries for the same URL
  const filtered = history.filter((h) => h.url !== result.url)

  const entry: HistoryEntry = {
    url: result.url,
    score: result.score,
    totalIssues: result.totalIssues,
    errors: result.errors,
    warnings: result.warnings,
    infos: result.infos,
    scannedAt: result.scannedAt,
  }

  const updated = [entry, ...filtered].slice(0, MAX_ENTRIES)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // localStorage might be full or unavailable
  }

  return updated
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function getLastResult(): ScanResult | null {
  try {
    const raw = localStorage.getItem(LAST_RESULT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ScanResult
  } catch {
    return null
  }
}

export function saveLastResult(result: ScanResult): void {
  try {
    localStorage.setItem(LAST_RESULT_KEY, JSON.stringify(result))
  } catch {
    // localStorage might be full or unavailable
  }
}

export function clearLastResult(): void {
  try {
    localStorage.removeItem(LAST_RESULT_KEY)
  } catch {
    // ignore
  }
}

export function formatRelativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(isoString).toLocaleDateString()
}
