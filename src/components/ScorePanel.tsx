import { Card, CardContent } from '@/components/ui/Card'
import type { ScanResult } from '@/engine/types'

interface ScorePanelProps {
  result: ScanResult
}

export default function ScorePanel({ result }: ScorePanelProps) {
  const score = result.score
  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 50 ? 'C' : score >= 25 ? 'D' : 'F'
  const scoreColor = score >= 75 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-danger'

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Score Card */}
      <Card className="md:col-span-1">
        <CardContent className="p-6 flex flex-col items-center justify-center">
          <div className={`text-5xl font-bold ${scoreColor}`}>{score}</div>
          <div className="text-xs text-muted mt-1">out of 100</div>
          <div className={`mt-3 px-3 py-1 rounded-full text-sm font-semibold ${
            score >= 75 ? 'bg-success/15 text-success' : score >= 50 ? 'bg-warning/15 text-warning' : 'bg-danger/15 text-danger'
          }`}>
            Grade {grade}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <Card className="md:col-span-3">
        <CardContent className="p-6 grid grid-cols-2 gap-4">
          <StatBlock label="Errors" value={result.errors} variant="error" />
          <StatBlock label="Warnings" value={result.warnings} variant="warning" />
        </CardContent>
      </Card>
    </div>
  )
}

function StatBlock({ label, value, variant }: { label: string; value: number; variant: 'error' | 'warning' }) {
  const colors = {
    error: 'text-danger',
    warning: 'text-warning',
  }
  return (
    <div className="text-center">
      <div className={`text-3xl font-bold ${colors[variant]}`}>{value}</div>
      <div className="text-xs text-muted mt-1 uppercase tracking-wider">{label}</div>
    </div>
  )
}
