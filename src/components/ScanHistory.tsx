import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime, type HistoryEntry } from '@/lib/storage'

interface ScanHistoryProps {
  history: HistoryEntry[]
  onSelect: (url: string) => void
  onRemove: (url: string) => void
  onClear: () => void
  onClose: () => void
  onToggleFavorite: (entry: HistoryEntry) => void
  isFavorited: (url: string) => boolean
}

function UrlDisplay({ url }: { url: string }) {
  return (
    <div className="text-sm text-foreground group-hover:text-primary transition-colors min-w-0">
      <span className="truncate overflow-hidden whitespace-nowrap text-ellipsis block" title={url}>
        {url}
      </span>
    </div>
  )
}

export default function ScanHistory({ history, onSelect, onRemove, onClear, onClose, onToggleFavorite, isFavorited }: ScanHistoryProps) {
  return (
    <Card id="scan-history" className="w-full max-w-2xl mx-auto mt-4 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Recent Scans
          </h3>
          <div className="flex items-center gap-3">
            {history.length > 0 && (
              <button
                onClick={onClear}
                className="text-xs text-muted hover:text-danger transition-colors"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="text-xs text-muted hover:text-foreground transition-colors"
            >
              Close
            </button>
          </div>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-muted text-center py-4">
            No scans yet. Run a scan to see it here.
          </p>
        ) : (
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
                  onToggleFavorite(entry)
                }}
                className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-md transition-all opacity-0 group-hover:opacity-100 ${
                  isFavorited(entry.url)
                    ? 'text-warning hover:text-warning/70 hover:bg-warning/10 opacity-100'
                    : 'text-muted hover:text-warning hover:bg-warning/10'
                }`}
                title={isFavorited(entry.url) ? 'Remove from favorites' : 'Add to favorites'}
              >
                <svg className="w-4 h-4" fill={isFavorited(entry.url) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
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
        )}
      </CardContent>
    </Card>
  )
}
