import type { ScanResult, Issue, IssueLevel } from './types'
import { rules } from './rules'

/**
 * Calculate an accessibility score based on issue counts.
 * Formula: 100 - errors*5 - warnings*2 - infos*1, clamped to [0, 100].
 */
function calculateScore(
  errors: number,
  warnings: number,
  infos: number
): number {
  const score = 100 - errors * 5 - warnings * 2 - infos * 1
  return Math.max(0, Math.min(100, score))
}

/**
 * Count issues by severity level.
 */
function countByLevel(issues: Issue[]): {
  errors: number
  warnings: number
  infos: number
} {
  let errors = 0
  let warnings = 0
  let infos = 0

  for (const issue of issues) {
    switch (issue.level) {
      case 'error':
        errors++
        break
      case 'warning':
        warnings++
        break
      case 'info':
        infos++
        break
    }
  }

  return { errors, warnings, infos }
}

/**
 * Run all rules against a parsed Document and collect issues.
 */
function runRules(doc: Document): Issue[] {
  const allIssues: Issue[] = []

  for (const rule of rules) {
    try {
      const ruleIssues = rule.evaluate(doc)
      allIssues.push(...ruleIssues)
    } catch (err) {
      console.error(`[accessibility-analyzer] Rule "${rule.id}" failed:`, err)
    }
  }

  return allIssues
}

// ---------------------------------------------------------------------------
// Multi-strategy URL fetcher
// ---------------------------------------------------------------------------

interface FetchStrategy {
  name: string
  prepare: (url: string) => { reqUrl: string; init?: RequestInit }
}

/** Strategy 1: Direct fetch */
const directStrategy: FetchStrategy = {
  name: 'Direct',
  prepare: (url) => ({
    reqUrl: url,
    init: {
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    },
  }),
}

/** Strategy 2: allorigins.win */
const allOriginsStrategy: FetchStrategy = {
  name: 'Proxy: allorigins',
  prepare: (url) => ({
    reqUrl: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    init: { redirect: 'follow' },
  }),
}

/** Strategy 3: corsproxy.io */
const corsProxyStrategy: FetchStrategy = {
  name: 'Proxy: corsproxy.io',
  prepare: (url) => ({
    reqUrl: `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    init: { redirect: 'follow' },
  }),
}

/** Strategy 4: r.jina.ai reader proxy */
const jinaReaderStrategy: FetchStrategy = {
  name: 'Proxy: jina reader',
  prepare: (url) => ({
    reqUrl: `https://r.jina.ai/${url}`,
    init: {
      headers: {
        'X-Return-Format': 'html',
        'X-No-Cache': 'true',
      },
    },
  }),
}

/** Strategy 5: codetabs CORS proxy */
const codetabsStrategy: FetchStrategy = {
  name: 'Proxy: codetabs',
  prepare: (url) => ({
    reqUrl: `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`,
    init: { redirect: 'follow' },
  }),
}

/** Strategy 6: thingproxy */
const thingProxyStrategy: FetchStrategy = {
  name: 'Proxy: thingproxy',
  prepare: (url) => ({
    reqUrl: `https://thingproxy.freeboard.io/fetch/${url}`,
    init: { redirect: 'follow' },
  }),
}

/** Ordered list, tried in sequence until one succeeds. */
const fetchStrategies: FetchStrategy[] = [
  directStrategy,
  allOriginsStrategy,
  corsProxyStrategy,
  jinaReaderStrategy,
  codetabsStrategy,
  thingProxyStrategy,
]

/** Normalise user-entered URL: add https:// if no protocol. */
function normaliseUrl(url: string): string {
  const trimmed = url.trim()
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`
  }
  return trimmed
}

/** Quick check: does this text look like HTML? */
function looksLikeHtml(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    lower.includes('<html') ||
    lower.includes('<head') ||
    lower.includes('<body') ||
    lower.includes('<!doctype') ||
    lower.includes('<div') ||
    lower.includes('<p') ||
    lower.includes('<title')
  )
}

/**
 * Attempt to fetch HTML via multiple strategies.
 * Returns the HTML string and the strategy name that worked.
 */
async function fetchHtmlMultiStrategy(
  rawUrl: string
): Promise<{ html: string; strategy: string }> {
  const url = normaliseUrl(rawUrl)
  const errors: string[] = []

  for (const strategy of fetchStrategies) {
    const { reqUrl, init } = strategy.prepare(url)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15_000)
      const response = await fetch(reqUrl, { ...init, signal: controller.signal })
      clearTimeout(timeout)

      if (!response.ok) {
        errors.push(`${strategy.name}: HTTP ${response.status}`)
        continue
      }

      const text = await response.text()
      if (!text || text.length < 50) {
        errors.push(`${strategy.name}: empty response`)
        continue
      }

      if (!looksLikeHtml(text)) {
        errors.push(`${strategy.name}: response is not HTML`)
        continue
      }

      console.info(
        `[accessibility-analyzer] Fetched via ${strategy.name} (${text.length} chars)`
      )
      return { html: text, strategy: strategy.name }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${strategy.name}: ${msg}`)
    }
  }

  throw new Error(
    `All fetch strategies failed for "${url}".\n` +
      `Details:\n${errors.join('\n')}\n\n` +
      `Tip: Open the page in your browser, right-click, View Page Source, copy the HTML, and use HTML Paste Mode.`
  )
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scan a raw HTML string for accessibility issues.
 */
export function scanHtml(html: string, url?: string): ScanResult {
  const startTime = performance.now()

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const issues = runRules(doc)
  const { errors, warnings, infos } = countByLevel(issues)
  const score = calculateScore(errors, warnings, infos)

  const endTime = performance.now()

  return {
    url: url || '(pasted HTML)',
    score,
    totalIssues: issues.length,
    errors,
    warnings,
    infos,
    issues,
    scannedAt: new Date().toISOString(),
    durationMs: Math.round(endTime - startTime),
  }
}

/**
 * Fetch a URL and scan its HTML content for accessibility issues.
 *
 * Uses a multi-strategy approach: tries a direct request first, then
 * automatically falls back through several public CORS proxies until
 * one succeeds. The result includes which strategy was used.
 */
export async function scanUrl(rawUrl: string): Promise<ScanResult> {
  const startTime = performance.now()
  const url = normaliseUrl(rawUrl)

  const { html, strategy } = await fetchHtmlMultiStrategy(url)

  const parseStart = performance.now()
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const parseEnd = performance.now()

  if (!doc || !doc.documentElement) {
    throw new Error(`Failed to parse HTML from "${url}". The response may not be valid HTML.`)
  }

  console.debug(
    `[accessibility-analyzer] HTML parsed in ${(parseEnd - parseStart).toFixed(2)}ms (${html.length} chars)`
  )

  const issues = runRules(doc)
  const { errors, warnings, infos } = countByLevel(issues)
  const score = calculateScore(errors, warnings, infos)

  const endTime = performance.now()

  return {
    url,
    score,
    totalIssues: issues.length,
    errors,
    warnings,
    infos,
    issues,
    scannedAt: new Date().toISOString(),
    durationMs: Math.round(endTime - startTime),
    fetchStrategy: strategy,
  }
}

/**
 * Get summary statistics for a scan result.
 */
export function getSummary(result: ScanResult): {
  scoreLabel: string
  scoreColor: string
  statusText: string
} {
  const { score } = result

  let scoreLabel: string
  let scoreColor: string
  let statusText: string

  if (score >= 90) {
    scoreLabel = 'Excellent'
    scoreColor = 'green'
    statusText = 'This page has strong accessibility support with minor issues.'
  } else if (score >= 70) {
    scoreLabel = 'Good'
    scoreColor = 'blue'
    statusText = 'This page is mostly accessible but has some issues to address.'
  } else if (score >= 50) {
    scoreLabel = 'Needs Work'
    scoreColor = 'yellow'
    statusText = 'This page has significant accessibility issues that should be addressed.'
  } else {
    scoreLabel = 'Poor'
    scoreColor = 'red'
    statusText = 'This page has serious accessibility problems requiring immediate attention.'
  }

  return { scoreLabel, scoreColor, statusText }
}

/**
 * Group issues by rule ID for organized display.
 */
export function groupIssuesByRule(issues: Issue[]): Map<string, Issue[]> {
  const grouped = new Map<string, Issue[]>()

  for (const issue of issues) {
    const existing = grouped.get(issue.ruleId)
    if (existing) {
      existing.push(issue)
    } else {
      grouped.set(issue.ruleId, [issue])
    }
  }

  return grouped
}

/**
 * Filter issues by severity level.
 */
export function filterByLevel(issues: Issue[], level: IssueLevel): Issue[] {
  return issues.filter((i) => i.level === level)
}
