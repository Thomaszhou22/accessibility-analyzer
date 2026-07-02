import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'

interface UrlInputProps {
  onScan: (url: string) => void
  onScanHtml: (html: string) => void
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (showHtmlMode) {
      if (html.trim()) onScanHtml(html)
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
                <Input
                  type="text"
                  placeholder="example.com or https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <Button type="submit" disabled={loading || !url.trim()} className="shrink-0">
                  {loading ? 'Scanning...' : 'Scan'}
                </Button>
              </div>
              {showHint && (
                <p className="text-xs text-accent flex items-center gap-1">
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
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-3 border border-border rounded-lg">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-muted hover:text-white transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          How to extract HTML from a web page
        </span>
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 text-xs text-muted-foreground border-t border-border pt-3">
          <div>
            <div className="flex items-center gap-1.5 text-white font-medium mb-1">
              <span className="w-4 h-4 rounded bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">1</span>
              View Page Source (entire page)
            </div>
            <p className="pl-5.5">
              Right-click anywhere on the page and select <strong className="text-white">View Page Source</strong>, or press <kbd className="px-1 py-0.5 rounded bg-surface text-[10px] font-mono border border-border">Ctrl+U</kbd> (<kbd className="px-1 py-0.5 rounded bg-surface text-[10px] font-mono border border-border">Cmd+Option+U</kbd> on Mac). Then <kbd className="px-1 py-0.5 rounded bg-surface text-[10px] font-mono border border-border">Ctrl+A</kbd> to select all and <kbd className="px-1 py-0.5 rounded bg-surface text-[10px] font-mono border border-border">Ctrl+C</kbd> to copy. Paste the entire HTML here.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-white font-medium mb-1">
              <span className="w-4 h-4 rounded bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">2</span>
              DevTools (specific section)
            </div>
            <p className="pl-5.5">
              Press <kbd className="px-1 py-0.5 rounded bg-surface text-[10px] font-mono border border-border">F12</kbd> to open DevTools. Go to the <strong className="text-white">Elements</strong> tab. Right-click any element and select <strong className="text-white">Copy → Copy outerHTML</strong>. This is useful to scan just a component or section.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-white font-medium mb-1">
              <span className="w-4 h-4 rounded bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">3</span>
              Inspect element shortcut
            </div>
            <p className="pl-5.5">
              Right-click the element you want to inspect, then select <strong className="text-white">Inspect</strong>. The DevTools will jump to that element. Right-click it in the Elements panel, then <strong className="text-white">Copy → Copy outerHTML</strong>.
            </p>
          </div>
          <div className="border-t border-border pt-3 mt-3">
            <div className="flex items-center gap-1.5 text-white font-medium mb-2">
              <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Browser-specific shortcuts
            </div>
            <div className="space-y-1.5 pl-5.5">
              <div className="flex items-start gap-2">
                <span className="text-white font-medium min-w-[60px]">Chrome</span>
                <span>Right-click → <strong className="text-white">Inspect</strong> or <kbd className="px-1 py-0.5 rounded bg-surface text-[10px] font-mono border border-border">Ctrl+Shift+I</kbd></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-white font-medium min-w-[60px]">Firefox</span>
                <span>Right-click → <strong className="text-white">Inspect Element</strong> or <kbd className="px-1 py-0.5 rounded bg-surface text-[10px] font-mono border border-border">Ctrl+Shift+I</kbd></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-white font-medium min-w-[60px]">Safari</span>
                <span>Enable <strong className="text-white">Develop menu</strong> first (Preferences → Advanced → Show Develop menu). Then right-click → <strong className="text-white">Inspect Element</strong> or <kbd className="px-1 py-0.5 rounded bg-surface text-[10px] font-mono border border-border">Cmd+Option+I</kbd></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-white font-medium min-w-[60px]">Edge</span>
                <span>Same as Chrome: Right-click → <strong className="text-white">Inspect</strong> or <kbd className="px-1 py-0.5 rounded bg-surface text-[10px] font-mono border border-border">F12</kbd></span>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-3 mt-3">
            <div className="flex items-center gap-1.5 text-white font-medium mb-2">
              <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Common questions
            </div>
            <div className="space-y-2 pl-5.5">
              <div>
                <p className="text-white font-medium mb-0.5">Can I paste just a part of the HTML?</p>
                <p>Yes. The scanner works with partial HTML too. You can paste a single component, a form, or any snippet you want to test.</p>
              </div>
              <div>
                <p className="text-white font-medium mb-0.5">What if the page is dynamic (React/Vue)?</p>
                <p>Use <strong className="text-white">Method 2 or 3</strong> (DevTools). The Elements tab shows the current rendered HTML, including dynamically generated content.</p>
              </div>
              <div>
                <p className="text-white font-medium mb-0.5">The HTML looks empty or different from what I see</p>
                <p>Some pages load content with JavaScript. Use <strong className="text-white">DevTools</strong> instead of View Page Source. The Elements tab shows the final rendered DOM.</p>
              </div>
              <div>
                <p className="text-white font-medium mb-0.5">Can I scan a local HTML file?</p>
                <p>Yes. Open the file in your browser, then use any of the methods above to extract the HTML.</p>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted italic pl-1">
            Tip: You can paste the full page HTML or just a snippet. Partial HTML works too — the scanner will analyze whatever you paste.
          </p>
        </div>
      )}
    </div>
  )
}
