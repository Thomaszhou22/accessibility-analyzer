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

// Map of ruleId + title pattern -> fix code
const fixCodeMap: Record<string, string> = {
  'img-alt': '<img src="photo.jpg" alt="Description of the image" />\n<img src="decorative.png" alt="" role="presentation" />',
  'color-contrast': '/* Before */\n<p style="color: #aaa; background: #fff;">Text</p>\n\n/* After (4.5:1+) */\n<p style="color: #333; background: #fff;">Text</p>\n\n// React\n<p className="text-gray-800 bg-white">Text</p>',
  'form-label': '<!-- HTML -->\n<label for="email">Email</label>\n<input type="email" id="email" />\n\n// React\n<label htmlFor="email">\n  Email\n  <input type="email" id="email" />\n</label>\n\n// Or aria-label\n<input type="text" aria-label="Email address" />',
  'button-text': '<!-- HTML -->\n<button aria-label="Close">\u00d7</button>\n<button aria-label="Search"><svg>...</svg></button>\n\n// React\n<button aria-label="Close" onClick={onClose}>\u00d7</button>',
  'link-text': '<!-- Before -->\n<a href="/guide">click here</a>\n\n<!-- After -->\n<a href="/guide">Read our accessibility guide</a>',
  'heading-order': '<!-- Before -->\n<h1>Main Title</h1>\n<h3>Subsection</h3>\n\n<!-- After -->\n<h1>Main Title</h1>\n<h2>Section</h2>\n<h3>Subsection</h3>',
  'html-lang': '<html lang="en">\n<html lang="zh-CN">',
  'empty-link': '<a href="/page">Go to page</a>\n\n// Or icon link\n<a href="/page" aria-label="Go to page">\n  <svg>...</svg>\n</a>',
  'tabindex': '<!-- Before -->\n<div tabindex="3">Third</div>\n\n<!-- After -->\n<div tabindex="0">Third</div>\n\n// React\n<div tabIndex={0}>Third</div>',
  'iframe-title': '<iframe src="..." title="YouTube video player" />\n\n// React\n<iframe src="..." title="YouTube video player" />',
  'duplicate-id': '<!-- Before -->\n<div id="section">A</div>\n<div id="section">B</div>\n\n<!-- After -->\n<div id="section-1">A</div>\n<div id="section-2">B</div>',
  'meta-viewport': '<!-- Before -->\n<meta name="viewport" content="user-scalable=no" />\n\n<!-- After -->\n<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
  'aria-valid': '<div role="button">Action</div>\n<div role="dialog">Modal</div>\n<div role="navigation">Nav</div>\n<div role="search">Search area</div>',
  'list-structure': '<!-- Before -->\n<ul>\n  <div>Not a list item</div>\n</ul>\n\n<!-- After -->\n<ul>\n  <li>Valid list item</li>\n</ul>',
  'media-caption': '<video src="demo.mp4">\n  <track kind="captions" src="captions.vtt" srclang="en" label="English" default />\n</video>',
}

function attachFixCodes(issues: Issue[]): Issue[] {
  return issues.map(issue => {
    const fix = fixCodeMap[issue.ruleId]
    if (fix && !issue.fixCode) {
      return { ...issue, fixCode: fix }
    }
    return issue
  })
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

/** Strategy 2: Our own serverless proxy (Vercel function, most reliable) */
const ownProxyStrategy: FetchStrategy = {
  name: 'Proxy: server',
  prepare: (url) => ({
    reqUrl: `/api/proxy?url=${encodeURIComponent(url)}`,
    init: { redirect: 'follow' },
  }),
}

/** Strategy 3: allorigins.win */
const allOriginsStrategy: FetchStrategy = {
  name: 'Proxy: allorigins',
  prepare: (url) => ({
    reqUrl: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    init: { redirect: 'follow' },
  }),
}

/** Strategy 4: corsproxy.io */
const corsProxyStrategy: FetchStrategy = {
  name: 'Proxy: corsproxy.io',
  prepare: (url) => ({
    reqUrl: `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    init: { redirect: 'follow' },
  }),
}

/** Strategy 5: r.jina.ai reader proxy */
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

/** Strategy 6: codetabs CORS proxy */
const codetabsStrategy: FetchStrategy = {
  name: 'Proxy: codetabs',
  prepare: (url) => ({
    reqUrl: `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`,
    init: { redirect: 'follow' },
  }),
}

/** Strategy 7: thingproxy */
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
  ownProxyStrategy,
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

  const issues = attachFixCodes(runRules(doc))
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

  const issues = attachFixCodes(runRules(doc))
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
