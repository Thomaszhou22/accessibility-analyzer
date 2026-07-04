import ScanInput from '@/components/ScanInput'
import ScanHistory from '@/components/ScanHistory'
import Favorites from '@/components/Favorites'
import TrendChart from '@/components/TrendChart'
import UrlScoreHistory from '@/components/UrlScoreHistory'
import ScorePanel from '@/components/ScorePanel'
import IssueList from '@/components/IssueList'
import PreviewPanel from '@/components/PreviewPanel'
import ReportLayout from '@/components/ReportLayout'
import HeroModal from '@/components/Hero'
import { Button } from '@/components/ui/Button'
import { useState, useEffect, useCallback } from 'react'
import type { ScanResult } from '@/engine/types'
import { scanUrl, scanHtml } from '@/engine/scanner'
import { getHistory, addToHistory, clearHistory, removeFromHistory, getLastResult, saveLastResult, clearLastResult, getFavorites, addToFavorites, removeFromFavorites, isFavorited, type HistoryEntry } from '@/lib/storage'
import { getTheme, toggleTheme, type Theme } from '@/lib/theme'

// URLs that should never appear in the preview (our own app)
const SELF_URLS = [
  location.origin,
  location.href,
].filter(Boolean)

export default function App() {
  const [result, setResult] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)
  const [favorites, setFavorites] = useState<HistoryEntry[]>([])
  const [highlightSelector, setHighlightSelector] = useState<string | null>(null)
  const [highlightLabel, setHighlightLabel] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [pageResults, setPageResults] = useState<Map<string, ScanResult>>(new Map())
  const [currentPageUrl, setCurrentPageUrl] = useState<string | null>(null)
  const [initialUrl, setInitialUrl] = useState<string | null>(null)
  const [showHeroModal, setShowHeroModal] = useState(false)
  const [theme, setTheme] = useState<Theme>(getTheme())

  useEffect(() => {
    setHistory(getHistory())
    setFavorites(getFavorites())
    const last = getLastResult()
    if (last) {
      setResult(last)
      setShowPreview(!!last.html)
    }
    // Show hero modal on first visit
    const hasVisited = localStorage.getItem('accessscan-visited')
    if (!hasVisited) {
      setShowHeroModal(true)
      localStorage.setItem('accessscan-visited', 'true')
    }
  }, [])

  const handleThemeToggle = () => {
    const newTheme = toggleTheme()
    setTheme(newTheme)
  }

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

  const handleScanHtml = useCallback((html: string, sourceUrl?: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = scanHtml(html, sourceUrl)
      // If user provided a source URL, use it for preview base URL
      if (sourceUrl) {
        res.url = sourceUrl
      }
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
    // Prevent navigating to self
    if (SELF_URLS.some(u => url === u || url.startsWith(u + '/'))) {
      return
    }
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
      {/* Hero Modal */}
      <HeroModal open={showHeroModal} onClose={() => setShowHeroModal(false)} />

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
              <h1 className="text-base font-semibold text-foreground">A11y Analyzer</h1>
              <p className="text-xs text-muted">Web Accessibility Scanner</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHeroModal(true)}
              className="px-3 py-1.5 text-xs text-muted hover:text-foreground hover:bg-card/50 rounded transition-colors"
              title="About AccessScan"
            >
              About
            </button>
            <a href="https://www.w3.org/WAI/standards-guidelines/wcag/" target="_blank" rel="noopener noreferrer"
              className="text-xs text-muted hover:text-foreground transition-colors">
              WCAG 2.1
            </a>
            <a href="https://github.com/Thomaszhou22/accessibility-analyzer" target="_blank" rel="noopener noreferrer"
              className="px-2 py-1 text-muted hover:text-foreground transition-colors"
              title="GitHub Repository">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </a>
            <button
              onClick={handleThemeToggle}
              className="p-2 text-muted hover:text-foreground hover:bg-surface/50 rounded-lg transition-colors"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {!result && !loading && (
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">
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
              <div className="flex justify-center mt-3 gap-4">
                <button
                  onClick={() => {
                    setShowHistory(!showHistory)
                    if (!showHistory) {
                      setTimeout(() => {
                        document.getElementById('scan-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }, 100)
                    }
                  }}
                  className="text-xs text-muted hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Recent Scans ({history.length})
                </button>
                {favorites.length > 0 && (
                  <button
                    onClick={() => {
                      setShowFavorites(!showFavorites)
                      if (!showFavorites) {
                        setTimeout(() => {
                          document.getElementById('favorites-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }, 100)
                      }
                    }}
                    className="text-xs text-muted hover:text-warning transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    Favorites ({favorites.length})
                  </button>
                )}
              </div>
            )}
            {showFavorites && (
              <div id="favorites-panel">
              <Favorites
                favorites={favorites}
                onSelect={(url) => {
                  setShowFavorites(false)
                  handleHistorySelect(url)
                }}
                onRemove={(url) => {
                  const updated = removeFromFavorites(url)
                  setFavorites(updated)
                }}
                onClose={() => setShowFavorites(false)}
              />
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
                onToggleFavorite={(entry) => {
                  const updated = isFavorited(entry.url) ? removeFromFavorites(entry.url) : addToFavorites(entry)
                  setFavorites(updated)
                }}
                isFavorited={isFavorited}
              />
            )}
            {/* Scan Activity Heatmap - always visible when there's history */}
            {history.length > 0 && (
              <TrendChart history={history} />
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
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-foreground">Scan Results</h2>
                <ScanResultUrl url={result.url} durationMs={result.durationMs} fetchStrategy={result.fetchStrategy} />
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                {result.html && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowPreview(!showPreview)
                      if (showPreview) {
                        setHighlightSelector(null)
                        setHighlightLabel(null)
                      }
                    }}
                  >
                    {showPreview ? 'Hide Preview' : 'Show Preview'}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleExportPdf}>
                  Export PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  New Scan
                </Button>
              </div>
            </div>

            <ScorePanel result={result} />

            {/* Per-URL score history chart */}
            {history.filter(h => h.url === result.url).length >= 2 && (
              <UrlScoreHistory url={result.url} history={history} />
            )}

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
            Based on WCAG 2.1 Guidelines
          </p>
        </div>
      </footer>
    </div>
  )
}

function ScanResultUrl({ url, durationMs, fetchStrategy }: { url: string; durationMs: number; fetchStrategy?: string }) {
  const [expanded, setExpanded] = useState(false)
  const displayUrl = url || 'Pasted HTML'
  const needsTruncate = displayUrl.length > 50

  return (
    <div className="text-xs text-muted min-w-0 overflow-hidden">
      {needsTruncate && !expanded ? (
        <div className="flex items-center gap-1 flex-nowrap">
          <span className="truncate overflow-hidden whitespace-nowrap text-ellipsis block min-w-0 max-w-[280px] sm:max-w-[400px]">{displayUrl}</span>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="shrink-0 text-accent hover:text-primary whitespace-nowrap"
          >
            Show full
          </button>
        </div>
      ) : needsTruncate && expanded ? (
        <div className="flex items-start gap-1 flex-wrap">
          <span className="break-all whitespace-normal">{displayUrl}</span>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="shrink-0 text-accent hover:text-primary whitespace-nowrap"
          >
            Show less
          </button>
        </div>
      ) : (
        <span>{displayUrl}</span>
      )}
      {' · '}{durationMs}ms
      {fetchStrategy && (
        <>
          {' · '}
          <span className="px-1.5 py-0.5 rounded bg-accent/15 text-accent text-[10px] font-mono">
            {fetchStrategy}
          </span>
        </>
      )}
    </div>
  )
}
