import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'

interface UrlInputProps {
  onScan: (url: string) => void
  onScanHtml: (html: string, sourceUrl?: string) => void
  loading: boolean
}

function normaliseUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`
  }
  return trimmed
}

export default function ScanInput({ onScan, onScanHtml, loading }: UrlInputProps) {
  const [url, setUrl] = useState('')
  const [showHtmlMode, setShowHtmlMode] = useState(false)
  const [html, setHtml] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (showHtmlMode) {
      if (html.trim()) {
        const trimmedUrl = sourceUrl.trim()
        onScanHtml(html, trimmedUrl ? normaliseUrl(trimmedUrl) : undefined)
      }
    } else {
      if (url.trim()) {
        const normalised = normaliseUrl(url)
        setUrl(normalised)
        onScan(normalised)
      }
    }
  }

  const showHint = url.trim() && !/^https?:\/\//i.test(url.trim())

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setShowHtmlMode(false)}
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
              !showHtmlMode ? 'bg-primary/20 text-primary' : 'text-muted hover:text-white'
            }`}
          >
            URL Scanner
          </button>
          <button
            onClick={() => setShowHtmlMode(true)}
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
              showHtmlMode ? 'bg-primary/20 text-primary' : 'text-muted hover:text-white'
            }`}
          >
            HTML Paste Mode
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {!showHtmlMode ? (
            <>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="example.com or https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSubmit(e as unknown as React.FormEvent)
                    }
                  }}
                  className="flex-1 h-11 rounded-lg border border-border bg-background px-4 py-2 text-sm text-white placeholder:text-muted transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Button type="submit" disabled={loading || !url.trim()} className="shrink-0">
                  {loading ? 'Scanning...' : 'Scan'}
                </Button>
              </div>
              {showHint && (
                <p className="text-xs text-accent flex items-start gap-1 break-all">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Will scan: <span className="font-mono text-accent">{normaliseUrl(url)}</span>
                </p>
              )}
            </>
          ) : (
            <>
              <Textarea
                placeholder="<html>&#10;  <head>...</head>&#10;  <body>...</body>&#10;</html>"
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                disabled={loading}
                className="min-h-[200px] font-mono text-xs"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Source URL (optional, for loading CSS/images in preview)"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  disabled={loading}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="flex-1 h-9 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-white placeholder:text-muted transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <Button type="submit" disabled={loading || !html.trim()} className="w-full">
                {loading ? 'Scanning...' : 'Scan HTML'}
              </Button>
              <HtmlExtractTips />
            </>
          )}
        </form>

        {!showHtmlMode && (
          <p className="text-xs text-muted mt-3">
            Enter any URL. https:// will be added automatically if missing. We try a direct request first, then automatically fall back to CORS proxies if needed.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function HtmlExtractTips() {
  return (
    <div className="mt-2 text-xs text-muted leading-relaxed">
      <strong className="text-white">When to use this:</strong> URL scan blocked by bot detection, or page content is JS-rendered (React/Vue).
      <br />
      <strong className="text-white">How:</strong> Open the page in your browser, press <kbd className="px-1 py-0.5 rounded bg-surface text-[10px] font-mono border border-border">F12</kbd> → Elements tab → right-click <code className="text-accent">&lt;html&gt;</code> → Copy outerHTML. Paste here.
      <br />
      Fill in Source URL so CSS and images load correctly in the preview.
    </div>
  )
}
