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
      // Log rule evaluation errors but don't crash the entire scan
      console.error(`[accessibility-analyzer] Rule "${rule.id}" failed:`, err)
    }
  }

  return allIssues
}

/**
 * Scan a raw HTML string for accessibility issues.
 *
 * @param html - The HTML source code to scan
 * @param url - Optional URL to associate with the result (for reporting)
 * @returns ScanResult with all found issues and a computed score
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
 * Note: Due to browser CORS restrictions, this may fail for cross-origin URLs.
 * If you encounter CORS errors, consider using scanHtml() with manually pasted HTML,
 * or route the request through a server-side proxy.
 *
 * @param url - The URL of the page to scan
 * @returns ScanResult with all found issues and a computed score
 * @throws Error if the fetch fails or the response is not valid HTML
 */
export async function scanUrl(url: string): Promise<ScanResult> {
  const startTime = performance.now()

  let response: Response

  try {
    response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    })
  } catch (fetchErr) {
    const endTime = performance.now()
    throw new Error(
      `Failed to fetch URL "${url}". This may be due to CORS restrictions or network issues. ` +
        `Error: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}. ` +
        `Tip: You can manually copy the page HTML and use scanHtml() instead.`
    )
  }

  if (!response.ok) {
    throw new Error(
      `Fetch returned HTTP ${response.status} ${response.statusText} for URL "${url}".`
    )
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    console.warn(
      `[accessibility-analyzer] Response content-type is "${contentType}", expected text/html. Attempting to parse anyway.`
    )
  }

  const html = await response.text()

  const parseStart = performance.now()
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const parseEnd = performance.now()

  if (!doc || !doc.documentElement) {
    throw new Error(`Failed to parse HTML from URL "${url}". The response may not be valid HTML.`)
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
  }
}

/**
 * Get summary statistics for a scan result, useful for display.
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
export function filterByLevel(
  issues: Issue[],
  level: IssueLevel
): Issue[] {
  return issues.filter((i) => i.level === level)
}
