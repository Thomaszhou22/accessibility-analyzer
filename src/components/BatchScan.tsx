import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import type { ScanResult } from '@/engine/types'
import { scanUrl } from '@/engine/scanner'
import { fetchSitemap } from '@/lib/sitemap'

interface BatchScanProps {
  onScanComplete?: (result: ScanResult) => void
}

interface BatchScanState {
  status: 'idle' | 'fetching-sitemap' | 'scanning' | 'complete' | 'error'
  urls: string[]
  results: ScanResult[]
  currentUrl: string | null
  progress: number
  total: number
  error: string | null
}

export default function BatchScan({ onScanComplete }: BatchScanProps) {
  const [domain, setDomain] = useState('')
  const [previewResult, setPreviewResult] = useState<ScanResult | null>(null)
  const [state, setState] = useState<BatchScanState>({
    status: 'idle',
    urls: [],
    results: [],
    currentUrl: null,
    progress: 0,
    total: 0,
    error: null,
  })

  const handleStartBatchScan = async () => {
    if (!domain.trim()) return

    setState({
      status: 'fetching-sitemap',
      urls: [],
      results: [],
      currentUrl: null,
      progress: 0,
      total: 0,
      error: null,
    })

    try {
      const urls = await fetchSitemap(domain)

      if (urls.length === 0) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: 'No URLs found in sitemap. The site may not have a sitemap.xml file.',
        }))
        return
      }

      setState((prev) => ({
        ...prev,
        status: 'scanning',
        urls,
        total: urls.length,
      }))

      const results: ScanResult[] = []

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i]

        setState((prev) => ({
          ...prev,
          currentUrl: url,
          progress: i,
        }))

        try {
          const result = await scanUrl(url)
          results.push(result)
          if (onScanComplete) onScanComplete(result)
        } catch (err) {
          console.error(`[BatchScan] Failed to scan ${url}:`, err)
          const failedResult: ScanResult = {
            url,
            score: 0,
            totalIssues: 0,
            errors: 0,
            warnings: 0,
            infos: 0,
            issues: [],
            scannedAt: new Date().toISOString(),
            durationMs: 0,
            html: undefined,
          }
          results.push(failedResult)
          if (onScanComplete) onScanComplete(failedResult)
        }
      }

      setState((prev) => ({
        ...prev,
        status: 'complete',
        results,
        progress: urls.length,
        currentUrl: null,
      }))
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to fetch sitemap',
      }))
    }
  }

  const handleReset = () => {
    setDomain('')
    setState({
      status: 'idle',
      urls: [],
      results: [],
      currentUrl: null,
      progress: 0,
      total: 0,
      error: null,
    })
  }

  const sortedResults = [...state.results].sort((a, b) => a.score - b.score)

  // Preview mode
  if (previewResult) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-foreground truncate">{previewResult.url}</h3>
              <p className="text-xs text-muted mt-0.5">
                Score: {previewResult.score} · {previewResult.errors} errors · {previewResult.warnings} warnings
              </p>
            </div>
            <Button onClick={() => setPreviewResult(null)} variant="outline" size="sm">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Results
              </span>
            </Button>
          </div>
          {previewResult.html ? (
            <div className="rounded-lg overflow-hidden border border-border">
              <iframe
                srcDoc={previewResult.html}
                className="w-full"
                style={{ height: '70vh' }}
                sandbox="allow-same-origin allow-scripts"
                title="Preview"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-sm text-muted">
              No preview available for this page
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardContent className="p-6">
        {state.status === 'idle' && (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground mb-2">Batch Scan</h3>
              <p className="text-sm text-muted">
                Enter a domain to scan all pages from its sitemap (max 20 pages)
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={state.status !== 'idle'}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && domain.trim() && state.status === 'idle') {
                    e.preventDefault()
                    handleStartBatchScan()
                  }
                }}
                className="flex-1 h-11 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <Button
                onClick={handleStartBatchScan}
                disabled={!domain.trim()}
                className="shrink-0"
              >
                Start Batch Scan
              </Button>
            </div>

            <p className="text-xs text-muted mt-3">
              The scanner will fetch the sitemap.xml file and scan up to 20 pages. Results will be sorted by score.
            </p>
          </>
        )}

        {state.status === 'fetching-sitemap' && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 text-muted text-sm">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Fetching sitemap...
            </div>
          </div>
        )}

        {state.status === 'scanning' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Scanning in Progress</h3>
              <p className="text-sm text-muted">
                Scanning {state.progress + 1} of {state.total} pages...
              </p>
            </div>

            <div className="space-y-2">
              <div className="h-2 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(state.progress / state.total) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted">
                <span>{state.progress} / {state.total}</span>
                <span>{Math.round((state.progress / state.total) * 100)}%</span>
              </div>
            </div>

            {state.currentUrl && (
              <div className="p-3 bg-surface rounded-lg">
                <p className="text-xs text-muted mb-1">Currently scanning:</p>
                <p className="text-sm text-foreground font-mono truncate">{state.currentUrl}</p>
              </div>
            )}
          </div>
        )}

        {state.status === 'error' && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-danger/10 border border-danger/30">
              <p className="text-sm text-danger">{state.error}</p>
            </div>
            <Button onClick={handleReset} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {state.status === 'complete' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Batch Scan Complete</h3>
                <p className="text-sm text-muted">
                  Scanned {state.results.length} pages from {domain}
                </p>
              </div>
              <Button onClick={handleReset} variant="outline" size="sm">
                New Batch Scan
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted font-medium">URL</th>
                    <th className="text-center py-2 px-3 text-muted font-medium">Score</th>
                    <th className="text-center py-2 px-3 text-muted font-medium">Errors</th>
                    <th className="text-center py-2 px-3 text-muted font-medium">Warnings</th>
                    <th className="text-center py-2 px-3 text-muted font-medium">Issues</th>
                    <th className="text-center py-2 px-3 text-muted font-medium">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.map((result, idx) => (
                    <tr key={idx} className="border-b border-border hover:bg-surface/50">
                      <td className="py-2 px-3">
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-mono text-xs truncate block max-w-[260px]"
                          title={result.url}
                        >
                          {result.url}
                        </a>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                            result.score >= 90
                              ? 'bg-green-500/20 text-green-400'
                              : result.score >= 70
                              ? 'bg-blue-500/20 text-blue-400'
                              : result.score >= 50
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {result.score}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center text-red-400 font-medium">
                        {result.errors}
                      </td>
                      <td className="py-2 px-3 text-center text-yellow-400 font-medium">
                        {result.warnings}
                      </td>
                      <td className="py-2 px-3 text-center text-muted">
                        {result.totalIssues}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => setPreviewResult(result)}
                          disabled={!result.html}
                          className="text-xs text-primary hover:underline disabled:text-muted disabled:no-underline disabled:cursor-not-allowed"
                        >
                          {result.html ? 'View' : 'N/A'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-border">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {Math.round(sortedResults.reduce((sum, r) => sum + r.score, 0) / sortedResults.length)}
                </div>
                <div className="text-xs text-muted">Average Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">
                  {sortedResults.reduce((sum, r) => sum + r.errors, 0)}
                </div>
                <div className="text-xs text-muted">Total Errors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {sortedResults.reduce((sum, r) => sum + r.warnings, 0)}
                </div>
                <div className="text-xs text-muted">Total Warnings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {sortedResults.reduce((sum, r) => sum + r.totalIssues, 0)}
                </div>
                <div className="text-xs text-muted">Total Issues</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
