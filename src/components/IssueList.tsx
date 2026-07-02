import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { Issue, ScanResult } from '@/engine/types'

interface IssueListProps {
  result: ScanResult
  onIssueHover?: (highlightKey: string | null, label?: string | null) => void
  onIssueClick?: (highlightKey: string, label?: string | null) => void
}

export default function IssueList({ result, onIssueHover, onIssueClick }: IssueListProps) {
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = filter === 'all' ? result.issues : result.issues.filter((i) => i.level === filter)

  const filters = [
    { key: 'all' as const, label: 'All', count: result.issues.length },
    { key: 'error' as const, label: 'Errors', count: result.errors },
    { key: 'warning' as const, label: 'Warnings', count: result.warnings },
    { key: 'info' as const, label: 'Info', count: result.infos },
  ]

  return (
    <Card>
      <CardContent className="p-0">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 p-4 border-b border-border">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === f.key ? 'bg-primary/20 text-primary' : 'text-muted hover:text-white'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {/* Issue list */}
        <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
          {filtered.length === 0 && (
            <div className="p-8 text-center text-muted text-sm">No issues found in this category.</div>
          )}
          {filtered.map((issue, i) => (
            <IssueRow
              key={`${issue.id}-${i}`}
              issue={issue}
              expanded={expandedId === `${issue.id}-${i}`}
              onToggle={() => setExpandedId(expandedId === `${issue.id}-${i}` ? null : `${issue.id}-${i}`)}
              onHover={onIssueHover}
              onLocate={onIssueClick}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const textarea = document.createElement('textarea')
      textarea.value = code
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-muted hover:text-white hover:bg-white/10 transition-all"
      title="Copy code"
    >
      {copied ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 8l3.5 3.5L13 5" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="5" y="5" width="9" height="9" rx="1.5" />
          <path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H11" />
        </svg>
      )}
    </button>
  )
}

function CodeBlock({ code }: { code: string }) {
  const [expanded, setExpanded] = useState(false)
  const lines = code.split('\n')
  const previewLines = lines.slice(0, 2)
  const needsExpand = lines.length > 2

  return (
    <div className="rounded-md bg-[#0d1117] border border-[#30363d] overflow-hidden">
      <pre className={`text-xs font-mono text-[#e6edf3] p-3 overflow-x-auto ${!expanded && needsExpand ? 'max-h-[52px] overflow-hidden' : ''}`}>
        <code>{expanded ? code : previewLines.join('\n')}{!expanded && needsExpand ? '\n' : ''}</code>
      </pre>
      {needsExpand && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-3 py-1.5 text-[11px] text-[#8b949e] hover:text-[#e6edf3] bg-[#161b22] hover:bg-[#1c2128] border-t border-[#30363d] transition-colors"
        >
          {expanded ? 'Show less' : `Show more (${lines.length} lines)`}
        </button>
      )}
    </div>
  )
}

interface IssueRowProps {
  issue: Issue
  expanded: boolean
  onToggle: () => void
  onHover?: (highlightKey: string | null, label?: string | null) => void
  onLocate?: (highlightKey: string, label?: string | null) => void
}

function getHighlightKey(issue: Issue): string {
  if (issue.elementIndex !== undefined) {
    return `[data-a11y-idx="${issue.elementIndex}"]`
  }
  return issue.elementSelector
}

function IssueRow({ issue, expanded, onToggle, onHover, onLocate }: IssueRowProps) {
  const levelConfig = {
    error: { variant: 'error' as const, label: 'Error' },
    warning: { variant: 'warning' as const, label: 'Warning' },
    info: { variant: 'muted' as const, label: 'Info' },
  }
  const cfg = levelConfig[issue.level]

  const handleMouseEnter = () => {
    if (onHover) {
      onHover(getHighlightKey(issue), issue.title)
    }
  }

  const handleMouseLeave = () => {
    if (onHover) {
      onHover(null, null)
    }
  }

  const handleLocate = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onLocate) {
      onLocate(getHighlightKey(issue), issue.title)
    }
  }

  return (
    <div
      className="p-4 hover:bg-surface/50 transition-colors cursor-pointer"
      onClick={onToggle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={cfg.variant}>{cfg.label}</Badge>
            <Badge variant="default">WCAG {issue.wcagLevel}</Badge>
            <span className="text-xs text-muted font-mono">{issue.ruleId}</span>
          </div>
          <h4 className="text-sm font-medium text-white">{issue.title}</h4>
          {!expanded && <p className="text-xs text-muted mt-1 truncate">{issue.description}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {issue.elementSelector && onLocate && (
            <button
              onClick={handleLocate}
              className="w-7 h-7 flex items-center justify-center rounded-md text-muted hover:text-primary hover:bg-primary/10 transition-all"
              title="Locate in preview"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </button>
          )}
          <svg
            className={`w-4 h-4 text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm text-muted-foreground">{issue.description}</p>

          {issue.wcagCriteria.length > 0 && (
            <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
              <div className="text-xs text-primary mb-1.5 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                WCAG 2.1 Criteria:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {issue.wcagCriteria.map((criteria) => (
                  <a
                    key={criteria}
                    href={`https://www.w3.org/WAI/WCAG21/Understanding/${criteria.split(' ')[1] ? criteria.split(' ')[0] : criteria}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] text-primary hover:bg-primary/20 transition-colors"
                  >
                    {criteria}
                  </a>
                ))}
              </div>
            </div>
          )}

          {issue.elementHtml && (
            <div className="rounded-md bg-background border border-border p-3">
              <div className="text-xs text-muted mb-1">Element:</div>
              <pre className="text-xs font-mono text-accent overflow-x-auto">{issue.elementHtml}</pre>
            </div>
          )}

          {issue.recommendation && (
            <div className="rounded-md bg-success/5 border border-success/20 p-3">
              <div className="text-xs text-success mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Fix:
              </div>
              <p className="text-xs text-muted-foreground font-mono">{issue.recommendation}</p>
            </div>
          )}

          {issue.fixCode && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-xs text-primary flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Reference Fix Code
                </div>
                <CopyButton code={issue.fixCode} />
              </div>
              <CodeBlock code={issue.fixCode} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
