import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'

interface UrlInputProps {
  onScan: (url: string) => void
  onScanHtml: (html: string) => void
  loading: boolean
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
      if (url.trim()) onScan(url.trim())
    }
  }

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
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !url.trim()} className="shrink-0">
                {loading ? 'Scanning...' : 'Scan'}
              </Button>
            </div>
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
            </>
          )}
        </form>

        {!showHtmlMode && (
          <p className="text-xs text-muted mt-3">
            Enter any URL. We try a direct request first, then automatically fall back to CORS proxies if needed.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
