import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import type { HistoryEntry } from '@/lib/storage'

interface TrendChartProps {
  history: HistoryEntry[]
}

const DAYS = 90
const CELL_SIZE = 14
const CELL_GAP = 3
const COLS = Math.ceil(DAYS / 7) // ~13 weeks
const ROWS = 7

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getColor(count: number): string {
  if (count === 0) return '#1a1a2e'
  if (count === 1) return '#166534'
  if (count <= 3) return '#22c55e'
  return '#15803d'
}

function getDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function TrendChart({ history }: TrendChartProps) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)

  if (history.length === 0) {
    return (
      <Card className="w-full max-w-2xl mx-auto mt-4">
        <CardContent className="p-4 text-center">
          <p className="text-xs text-muted">
            Start scanning to see your activity
          </p>
        </CardContent>
      </Card>
    )
  }

  // Count scans per day
  const scanCounts: Record<string, number> = {}
  for (const entry of history) {
    const day = entry.scannedAt.slice(0, 10) // YYYY-MM-DD
    scanCounts[day] = (scanCounts[day] || 0) + 1
  }

  const totalScans = history.length

  // Build the grid: today is the last cell (bottom-right)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Generate all cells
  const cells: { date: Date; dateStr: string; count: number; col: number; row: number }[] = []

  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = getDateStr(d)
    const dayIndex = DAYS - 1 - i // 0..89
    const col = Math.floor(dayIndex / 7)
    const row = dayIndex % 7
    cells.push({
      date: d,
      dateStr,
      count: scanCounts[dateStr] || 0,
      col,
      row,
    })
  }

  // SVG dimensions
  const svgWidth = COLS * (CELL_SIZE + CELL_GAP) + 40
  const svgHeight = ROWS * (CELL_SIZE + CELL_GAP) + 30

  // Month labels: find first cell of each month
  const monthLabels: { label: string; col: number }[] = []
  let lastMonth = -1
  for (const cell of cells) {
    const m = cell.date.getMonth()
    if (m !== lastMonth) {
      monthLabels.push({ label: MONTH_LABELS[m], col: cell.col })
      lastMonth = m
    }
  }

  // Day labels (Mon, Wed, Fri)
  const dayLabels = [
    { label: 'Mon', row: 1 },
    { label: 'Wed', row: 3 },
    { label: 'Fri', row: 5 },
  ]

  return (
    <Card className="w-full max-w-2xl mx-auto mt-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Scan Activity
          </h3>
          <span className="text-xs text-muted">
            <span className="text-foreground font-semibold">{totalScans}</span> scans in the last 90 days
          </span>
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full"
            style={{ minWidth: '480px', height: '140px' }}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Day labels on the left */}
            {dayLabels.map(({ label, row }) => (
              <text
                key={label}
                x={0}
                y={30 + row * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2}
                textAnchor="start"
                dominantBaseline="middle"
                className="text-[9px] fill-muted"
              >
                {label}
              </text>
            ))}

            {/* Cells */}
            <g transform="translate(32, 0)">
              {cells.map((cell) => {
                const x = cell.col * (CELL_SIZE + CELL_GAP)
                const y = 20 + cell.row * (CELL_SIZE + CELL_GAP)
                return (
                  <rect
                    key={cell.dateStr}
                    x={x}
                    y={y}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                    rx={2}
                    ry={2}
                    fill={getColor(cell.count)}
                    stroke="#2a2a3e"
                    strokeWidth={1}
                    className="cursor-pointer"
                    onMouseEnter={(e) => {
                      const rect = (e.target as SVGRectElement).getBoundingClientRect()
                      const svgRect = (e.target as SVGRectElement).closest('svg')!.getBoundingClientRect()
                      setTooltip({
                        text: `${cell.dateStr}: ${cell.count} scan${cell.count !== 1 ? 's' : ''}`,
                        x: rect.left - svgRect.left + CELL_SIZE / 2,
                        y: rect.top - svgRect.top - 8,
                      })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )
              })}

              {/* Month labels */}
              {monthLabels.map(({ label, col }) => (
                <text
                  key={`${label}-${col}`}
                  x={col * (CELL_SIZE + CELL_GAP)}
                  y={14}
                  textAnchor="start"
                  className="text-[9px] fill-muted"
                >
                  {label}
                </text>
              ))}
            </g>

            {/* Tooltip */}
            {tooltip && (
              <g>
                <rect
                  x={tooltip.x - 60}
                  y={tooltip.y - 20}
                  width={120}
                  height={20}
                  rx={4}
                  fill="#2a2a3e"
                  stroke="#3a3a4e"
                  strokeWidth={1}
                />
                <text
                  x={tooltip.x}
                  y={tooltip.y - 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[10px] fill-white"
                >
                  {tooltip.text}
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-1 mt-2">
          <span className="text-[9px] text-muted mr-1">Less</span>
          {[0, 1, 2, 4].map((count) => (
            <rect
              key={count}
              width={10}
              height={10}
              rx={2}
              fill={getColor(count)}
              stroke="#2a2a3e"
              strokeWidth={1}
            />
          ))}
          <span className="text-[9px] text-muted ml-1">More</span>
        </div>
      </CardContent>
    </Card>
  )
}
