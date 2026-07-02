// Issue severity levels
export type IssueLevel = 'error' | 'warning' | 'info'

// WCAG conformance levels
export type WCAGLevel = 'A' | 'AA' | 'AAA'

// A single accessibility issue found on a page
export interface Issue {
  id: string
  ruleId: string
  level: IssueLevel
  wcagLevel: WCAGLevel
  wcagCriteria: string[]
  title: string
  description: string
  elementSelector: string
  elementHtml: string
  recommendation: string
  autoFix?: string
}

// Full scan result for a page
export interface ScanResult {
  url: string
  score: number
  totalIssues: number
  errors: number
  warnings: number
  infos: number
  issues: Issue[]
  scannedAt: string
  durationMs: number
  fetchStrategy?: string
}

// A WCAG detection rule
export interface Rule {
  id: string
  name: string
  description: string
  wcagLevel: WCAGLevel
  evaluate: (doc: Document) => Issue[]
}
