import ScanInput from '@/components/ScanInput'
import ScanHistory from '@/components/ScanHistory'
import ScorePanel from '@/components/ScorePanel'
import IssueList from '@/components/IssueList'
import PreviewPanel from '@/components/PreviewPanel'
import ReportLayout from '@/components/ReportLayout'
import { Button } from '@/components/ui/Button'
import { useState, useEffect, useCallback } from 'react'
import type { ScanResult } from '@/engine/types'
import { scanUrl, scanHtml } from '@/engine/scanner'
import { getHistory, addToHistory, clearHistory, removeFromHistory, getLastResult, saveLastResult, clearLastResult, type HistoryEntry } from '@/lib/storage'

export default function App() {
  const [result, setResult] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [highlightSelector, setHighlightSelector] = useState<string | null>(null)
  const [highlightLabel, setHighlightLabel] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [pageResults, setPageResults] = useState<Map<string, ScanResult>>(new Map())
  const [currentPageUrl, setCurrentPageUrl] = useState<string | null>(null)
  const [initialUrl, setInitialUrl] = useState<string | null>(null)

  useEffect(() => {
    setHistory(getHistory())
    const last = getLastResult()
    if (last) {
      setResult(last)
      setShowPreview(!!last.html)
    }
  }, [])

  const handleScanUrl = useCallback(async (url: string, isNavigation = false) => {
    setLoading(true)
    setError(null)
    try {
      const res = await scanUrl(url)
      setResult(res)
      saveLastResult(res)
      setShowPreview(!!res.html)
      setCurrentPageUrl(url)
      if (!isNavigation) {
        setInitialUrl(url)
        setPageResults(new Map([[url, res]]))
      } else {
        setPageResults(prev => new Map(prev).set(url, res))
      }
      const updated = addToHistory(res)
      setHistory(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed. Try HTML Paste Mode.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleScanHtml = useCallback((html: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = scanHtml(html)
      setResult(res)
      saveLastResult(res)
      setShowPreview(!!res.html)
      const updated = addToHistory(res)
      setHistory(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleReset = () => {
    setResult(null)
    setError(null)
    setHighlightSelector(null)
    setHighlightLabel(null)
    setShowPreview(false)
    setPageResults(new Map())
    setCurrentPageUrl(null)
    setInitialUrl(null)
    clearLastResult()
  }

  const handleClearHistory = () => {
    clearHistory()
    setHistory([])
  }

  const handleRemoveHistory = (url: string) => {
    const updated = removeFromHistory(url)
    setHistory(updated)
    if (result && result.url === url) {
      setResult(null)
      clearLastResult()
    }
  }

  const handleHistorySelect = (url: string) => {
    handleScanUrl(url)
  }

  const handleExportPdf = () => {
    window.print()
  }

  const handleIssueClick = useCallback((selector: string, label?: string | null) => {
    if (!selector || !selector.trim()) {
      setHighlightSelector(null)
      setHighlightLabel(null)
    } else {
      setHighlightSelector(selector)
      setHighlightLabel(label ?? null)
      setShowPreview(true)
    }
  }, [])

  const handleNavigate = useCallback((url: string) => {
    const alreadyScanned = pageResults.get(url)
    if (alreadyScanned) {
      setResult(alreadyScanned)
      setCurrentPageUrl(url)
      setHighlightSelector(null)
      setHighlightLabel(null)
    } else {
      handleScanUrl(url, true)
    }
  }, [pageResults, handleScanUrl])

  return (
    <div className="min-h-screen">
      {/* Hidden report layout for printing */}
      {result && <ReportLayout result={result} />}

      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold text-white">A11y Analyzer</h1>
              <p className="text-xs text-muted">Web Accessibility Scanner</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://www.w3.org/WAI/standards-guidelines/wcag/" target="_blank" rel="noopener noreferrer"
              className="text-xs text-muted hover:text-white transition-colors">
              WCAG 2.1
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {!result && !loading && (
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              Make the web accessible for everyone
            </h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Scan any website for WCAG 2.1 accessibility issues. Get instant scores,
              detailed reports, and actionable fix recommendations.
            </p>
          </div>
        )}

        {!result && (
          <>
            <ScanInput onScan={handleScanUrl} onScanHtml={handleScanHtml} loading={loading} />
            {history.length > 0 && (
              <div className="flex justify-center mt-3">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-xs text-muted hover:text-white transition-colors flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Recent Scans ({history.length})
                </button>
              </div>
            )}
            {showHistory && (
              <ScanHistory
                history={history}
                onSelect={(url) => {
                  setShowHistory(false)
                  handleHistorySelect(url)
                }}
                onRemove={handleRemoveHistory}
                onClear={handleClearHistory}
              />
            )}
          </>
        )}

        {error && (
          <div className="mt-4 p-4 rounded-lg bg-danger/10 border border-danger/30 text-sm text-danger">
            {error}
          </div>
        )}

        {loading && (
          <div className="mt-8 flex items-center justify-center">
            <div className="flex items-center gap-3 text-muted text-sm">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Scanning website...
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-4">
            {/* Result header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Scan Results</h2>
                <p className="text-xs text-muted">
                  {result.url || 'Pasted HTML'} · {result.durationMs}ms
                  {result.fetchStrategy && (
                    <>
                      {' · '}
                      <span className="px-1.5 py-0.5 rounded bg-accent/15 text-accent text-[10px] font-mono">
                        {result.fetchStrategy}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {result.html && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {showPreview ? 'Hide Preview' : 'Show Preview'}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleExportPdf}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  New Scan
                </Button>
              </div>
            </div>

            <ScorePanel result={result} />

            {/* Split view: preview + issues */}
            {showPreview && result.html ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="lg:order-1">
                  <PreviewPanel
                    html={result.html}
                    baseUrl={result.url && result.url !== '(pasted HTML)' ? result.url : null}
                    highlightSelector={highlightSelector}
                    highlightLabel={highlightLabel}
                    onNavigate={handleNavigate}
                  />
                </div>
                <div className="lg:order-2">
                  <IssueList
                    result={result}
                    onIssueClick={handleIssueClick}
                  />
                </div>
              </div>
            ) : (
              <IssueList
                result={result}
                onIssueClick={handleIssueClick}
              />
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4 text-center">
          <p className="text-xs text-muted">
            Built for Web Champ Hackathon · Based on WCAG 2.1 Guidelines
          </p>
        </div>
      </footer>
    </div>
  )
}
