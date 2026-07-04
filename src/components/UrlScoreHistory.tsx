import { Card, CardContent } from '@/components/ui/Card'
import type { HistoryEntry } from '@/lib/storage'

interface UrlScoreHistoryProps {
  url: string
  history: HistoryEntry[]
}

export default function UrlScoreHistory({ url, history }: UrlScoreHistoryProps) {
  // Filter to only this URL's entries, sorted by time ascending
  const entries = history
    .filter((h) => h.url === url)
    .sort((a, b) => new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime())

  if (entries.length < 2) return null

  // Extract domain for display
  let domain = url
  try {
    domain = new URL(url).hostname
  } catch {
    // keep raw url
  }

  const W = 480
  const H = 120
  const padX = 36
  const padY = 20
  const chartW = W - padX * 2
  const chartH = H - padY * 2

  // Build points
  const points = entries.map((e, i) => {
    const x = entries.length === 1 ? W / 2 : padX + (i / (entries.length - 1)) * chartW
    const y = padY + chartH - (e.score / 100) * chartH
    return { x, y, score: e.score, time: e.scannedAt }
  })

  // SVG path
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`)
    .join(' ')

  // Score color for each point
  const scoreColor = (s: number) =>
    s >= 75 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444'

  // Time labels (first and last)
  const fmtTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Score History for {domain}
            </h3>
            <p className="text-[11px] text-muted mt-0.5">{entries.length} scans</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted">
            <span>
              Latest: <strong className="text-foreground">{entries[entries.length - 1].score}</strong>
            </span>
            <span>
              Change: <strong className={
                entries[entries.length - 1].score > entries[0].score
                  ? 'text-success'
                  : entries[entries.length - 1].score < entries[0].score
                  ? 'text-danger'
                  : 'text-muted'
              }>
                {entries[entries.length - 1].score - entries[0].score > 0 ? '+' : ''}
                {entries[entries.length - 1].score - entries[0].score}
              </strong>
            </span>
          </div>
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: '120px' }}
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((v) => {
            const y = padY + chartH - (v / 100) * chartH
            return (
              <g key={v}>
                <line
                  x1={padX}
                  x2={W - padX}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  className="text-border"
                  strokeWidth="0.5"
                  strokeDasharray="3,3"
                />
                <text
                  x={padX - 4}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[8px] fill-muted"
                  fontSize="8"
                >
                  {v}
                </text>
              </g>
            )
          })}

          {/* Time labels at first and last points */}
          {points.length > 1 && (
            <>
              <text
                x={points[0].x}
                y={H - 2}
                textAnchor="start"
                className="fill-muted"
                fontSize="8"
              >
                {fmtTime(points[0].time)}
              </text>
              <text
                x={points[points.length - 1].x}
                y={H - 2}
                textAnchor="end"
                className="fill-muted"
                fontSize="8"
              >
                {fmtTime(points[points.length - 1].time)}
              </text>
            </>
          )}

          {/* Line path */}
          <path
            d={pathD}
            fill="none"
            stroke="#6366f1"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Area fill under the line */}
          <path
            d={`${pathD} L${points[points.length - 1].x},${padY + chartH} L${points[0].x},${padY + chartH} Z`}
            fill="url(#scoreGradient)"
            opacity="0.3"
          />

          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Data points with score labels */}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="4"
                fill={scoreColor(p.score)}
                stroke="#1a1a2e"
                strokeWidth="1.5"
              />
              <text
                x={p.x}
                y={p.y - 8}
                textAnchor="middle"
                className="fill-foreground"
                fontSize="9"
                fontWeight="600"
              >
                {p.score}
              </text>
            </g>
          ))}
        </svg>
      </CardContent>
    </Card>
  )
}
