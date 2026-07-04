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
const MAX_ENTRIES = 50

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

  const entry: HistoryEntry = {
    url: result.url,
    score: result.score,
    totalIssues: result.totalIssues,
    errors: result.errors,
    warnings: result.warnings,
    infos: result.infos,
    scannedAt: result.scannedAt,
  }

  const updated = [entry, ...history].slice(0, MAX_ENTRIES)

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

export function getUrlHistory(url: string): HistoryEntry[] {
  const history = getHistory()
  return history.filter((h) => h.url === url).reverse()
}

export function removeFromHistory(url: string): HistoryEntry[] {
  const history = getHistory()
  const updated = history.filter((h) => h.url !== url)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
  return updated
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

const FAVORITES_KEY = 'a11y-favorites'

export function getFavorites(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

export function addToFavorites(entry: HistoryEntry): HistoryEntry[] {
  const favorites = getFavorites()
  const filtered = favorites.filter((f) => f.url !== entry.url)
  const updated = [entry, ...filtered]
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
  return updated
}

export function removeFromFavorites(url: string): HistoryEntry[] {
  const favorites = getFavorites()
  const updated = favorites.filter((f) => f.url !== url)
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
  return updated
}

export function isFavorited(url: string): boolean {
  const favorites = getFavorites()
  return favorites.some((f) => f.url === url)
}

const ACTIVITY_KEY = 'a11y-activity'
const SCORE_LOG_KEY = 'a11y-score-log'
const MAX_ACTIVITY = 500

export interface ActivityEntry {
  url: string
  score: number
  scannedAt: string
}

export function getActivity(): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.slice(0, MAX_ACTIVITY)
  } catch {
    return []
  }
}

export function addActivity(result: ScanResult): ActivityEntry[] {
  const activity = getActivity()
  const entry: ActivityEntry = {
    url: result.url,
    score: result.score,
    scannedAt: result.scannedAt,
  }
  const updated = [entry, ...activity].slice(0, MAX_ACTIVITY)
  try {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
  return updated
}

export function clearActivity(): void {
  try {
    localStorage.removeItem(ACTIVITY_KEY)
  } catch {
    // ignore
  }
}

export interface ScoreLogEntry {
  url: string
  score: number
  scannedAt: string
}

export function getScoreLog(): ScoreLogEntry[] {
  try {
    const raw = localStorage.getItem(SCORE_LOG_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

export function addScoreLog(result: ScanResult): ScoreLogEntry[] {
  const log = getScoreLog()
  const entry: ScoreLogEntry = {
    url: result.url,
    score: result.score,
    scannedAt: result.scannedAt,
  }
  const updated = [entry, ...log]
  try {
    localStorage.setItem(SCORE_LOG_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
  return updated
}

export function getUrlScoreLog(url: string): ScoreLogEntry[] {
  const log = getScoreLog()
  return log.filter((e) => e.url === url).reverse()
}

export function clearScoreLog(): void {
  try {
    localStorage.removeItem(SCORE_LOG_KEY)
  } catch {
    // ignore
  }
}

export function clearFavorites(): void {
  try {
    localStorage.removeItem(FAVORITES_KEY)
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
