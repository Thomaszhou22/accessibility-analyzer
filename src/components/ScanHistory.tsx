import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime, type HistoryEntry } from '@/lib/storage'

interface ScanHistoryProps {
  history: HistoryEntry[]
  onSelect: (url: string) => void
  onRemove: (url: string) => void
  onClear: () => void
}

function UrlDisplay({ url }: { url: string }) {
  const [expanded, setExpanded] = useState(false)
  const needsTruncate = url.length > 40
  return (
    <div className="text-sm text-white group-hover:text-primary transition-colors min-w-0 overflow-hidden">
      {needsTruncate && !expanded ? (
        <div className="flex items-center gap-1 min-w-0">
          <span className="truncate overflow-hidden whitespace-nowrap text-ellipsis block min-w-0">{url}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(true) }}
            className="shrink-0 text-xs text-accent hover:text-primary whitespace-nowrap"
          >
            Show full
          </button>
        </div>
      ) : needsTruncate && expanded ? (
        <div className="flex items-start gap-1">
          <span className="break-all whitespace-normal">{url}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(false) }}
            className="shrink-0 text-xs text-accent hover:text-primary mt-0.5 whitespace-nowrap"
          >
            Show less
          </button>
        </div>
      ) : (
        <span className="truncate overflow-hidden whitespace-nowrap text-ellipsis block">{url}</span>
      )}
    </div>
  )
}

export default function ScanHistory({ history, onSelect, onRemove, onClear }: ScanHistoryProps) {
  if (history.length === 0) return null

  return (
    <Card className="w-full max-w-2xl mx-auto mt-4 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Recent Scans
          </h3>
          <button
            onClick={onClear}
            className="text-xs text-muted hover:text-danger transition-colors"
          >
            Clear all
          </button>
        </div>
        <div className="space-y-1">
          {history.map((entry, i) => (
            <div
              key={`${entry.url}-${i}`}
              className="flex items-center gap-1 group"
            >
              <button
                onClick={() => onSelect(entry.url)}
                className="flex-1 flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-surface transition-colors text-left min-w-0 overflow-hidden"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    entry.score >= 75 ? 'bg-success/15 text-success' :
                    entry.score >= 50 ? 'bg-warning/15 text-warning' :
                    'bg-danger/15 text-danger'
                  }`}>
                    {entry.score}
                  </div>
                  <div className="min-w-0 flex-1">
                    <UrlDisplay url={entry.url} />
                    <div className="text-xs text-muted flex items-center gap-2 mt-0.5">
                      <span>{formatRelativeTime(entry.scannedAt)}</span>
                      <span>&middot;</span>
                      <span>{entry.totalIssues} issues</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {entry.errors > 0 && <Badge variant="error">{entry.errors}E</Badge>}
                  {entry.warnings > 0 && <Badge variant="warning">{entry.warnings}W</Badge>}
                </div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(entry.url)
                }}
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-muted hover:text-danger hover:bg-danger/10 transition-all opacity-0 group-hover:opacity-100"
                title="Remove"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
