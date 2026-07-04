import { Card, CardContent } from '@/components/ui/Card'
import type { HistoryEntry } from '@/lib/storage'

interface TrendChartProps {
  history: HistoryEntry[]
}

export default function TrendChart({ history }: TrendChartProps) {
  if (history.length < 2) {
    return (
      <Card className="w-full max-w-2xl mx-auto mt-4">
        <CardContent className="p-4 text-center">
          <p className="text-xs text-muted">
            Scan at least 2 websites to see score trends
          </p>
        </CardContent>
      </Card>
    )
  }

  // Sort by time ascending (oldest first)
  const sorted = [...history].sort(
    (a, b) => new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime()
  )

  const avgScore = Math.round(
    sorted.reduce((sum, e) => sum + e.score, 0) / sorted.length
  )

  // SVG dimensions
  const padding = { top: 16, right: 16, bottom: 32, left: 36 }
  const width = 560
  const height = 200
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  // Map data to coordinates
  const points = sorted.map((entry, i) => ({
    x: sorted.length === 1
      ? chartW / 2
      : (i / (sorted.length - 1)) * chartW,
    y: chartH - (entry.score / 100) * chartH,
    score: entry.score,
    url: entry.url,
    time: entry.scannedAt,
  }))

  // Build polyline path
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`)
    .join(' ')

  // Area fill path
  const areaPath = `${linePath} L${points[points.length - 1].x},${chartH} L${points[0].x},${chartH} Z`

  // Grid lines (horizontal: 0, 25, 50, 75, 100)
  const gridValues = [0, 25, 50, 75, 100]

  // Color helper
  function scoreColor(score: number) {
    if (score >= 75) return '#22c55e' // success
    if (score >= 50) return '#eab308' // warning
    return '#ef4444' // danger
  }

  // Format time label
  function formatTimeLabel(isoString: string) {
    const d = new Date(isoString)
    const month = d.getMonth() + 1
    const day = d.getDate()
    const hr = d.getHours().toString().padStart(2, '0')
    const min = d.getMinutes().toString().padStart(2, '0')
    return `${month}/${day} ${hr}:${min}`
  }

  return (
    <Card className="w-full max-w-2xl mx-auto mt-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Score Trend
          </h3>
          <span className="text-xs text-muted">
            Avg: <span className="text-foreground font-semibold">{avgScore}</span>
          </span>
        </div>

        <div className="w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full"
            style={{ height: '200px' }}
            preserveAspectRatio="xMidYMid meet"
          >
            <g transform={`translate(${padding.left},${padding.top})`}>
              {/* Grid lines */}
              {gridValues.map((v) => {
                const y = chartH - (v / 100) * chartH
                return (
                  <g key={v}>
                    <line
                      x1={0}
                      y1={y}
                      x2={chartW}
                      y2={y}
                      stroke="currentColor"
                      strokeOpacity={0.1}
                      strokeDasharray={v === 0 ? undefined : '4 4'}
                    />
                    <text
                      x={-8}
                      y={y}
                      textAnchor="end"
                      dominantBaseline="middle"
                      className="text-[10px] fill-muted"
                    >
                      {v}
                    </text>
                  </g>
                )
              })}

              {/* Area fill */}
              <path
                d={areaPath}
                fill="url(#trendGradient)"
                opacity={0.3}
              />

              {/* Gradient definition */}
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Line */}
              <path
                d={linePath}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points + labels */}
              {points.map((p, i) => (
                <g key={i}>
                  {/* Dot */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={4}
                    fill={scoreColor(p.score)}
                    stroke="#1a1a2e"
                    strokeWidth={2}
                  />

                  {/* Score label above dot */}
                  <text
                    x={p.x}
                    y={p.y - 10}
                    textAnchor="middle"
                    className="text-[10px] font-semibold fill-white"
                  >
                    {p.score}
                  </text>

                  {/* Time label on X axis */}
                  <text
                    x={p.x}
                    y={chartH + 16}
                    textAnchor="middle"
                    className="text-[9px] fill-muted"
                  >
                    {formatTimeLabel(sorted[i].scannedAt)}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </div>
      </CardContent>
    </Card>
  )
}
