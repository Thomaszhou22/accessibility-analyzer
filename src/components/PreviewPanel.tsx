import { useState, useRef, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { rewriteUrls } from '@/lib/rewriteUrls'

interface PreviewPanelProps {
  html: string
  baseUrl: string | null
  highlightSelector: string | null
}

const HIGHLIGHT_SCRIPT = `
<script>
(function() {
  function clearHighlights() {
    document.querySelectorAll('.a11y-hl-overlay, .a11y-hl-label').forEach(function(el) { el.remove(); });
    document.querySelectorAll('*').forEach(function(el) {
      if (el.style.outline === '3px solid rgb(239, 68, 68)' || el.style.outline === '3px solid #ef4444') {
        el.style.outline = '';
        el.style.outlineOffset = '';
      }
    });
  }

  function highlightElement(selector) {
    clearHighlights();
    var el;
    try {
      el = document.querySelector(selector);
    } catch(e) {
      return;
    }
    if (!el) return;

    var rect = el.getBoundingClientRect();
    var scrollY = window.scrollY || window.pageYOffset;
    var scrollX = window.scrollX || window.pageXOffset;

    var overlay = document.createElement('div');
    overlay.className = 'a11y-hl-overlay';
    overlay.style.cssText = 'position: absolute; top: ' + (rect.top + scrollY) + 'px; left: ' + (rect.left + scrollX) + 'px; width: ' + rect.width + 'px; height: ' + rect.height + 'px; border: 3px solid #ef4444; background: rgba(239, 68, 68, 0.12); pointer-events: none; z-index: 2147483646; box-sizing: border-box; transition: all 0.3s ease; border-radius: 2px;';
    document.body.appendChild(overlay);

    var label = document.createElement('div');
    label.className = 'a11y-hl-label';
    label.style.cssText = 'position: absolute; top: ' + (rect.top + scrollY - 28) + 'px; left: ' + (rect.left + scrollX) + 'px; background: #ef4444; color: white; font-size: 12px; font-family: system-ui, sans-serif; padding: 2px 8px; border-radius: 3px; z-index: 2147483647; pointer-events: none; white-space: nowrap;';
    label.textContent = 'Accessibility Issue';
    document.body.appendChild(label);

    el.style.outline = '3px solid #ef4444';
    el.style.outlineOffset = '2px';

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'a11y-highlight') {
      highlightElement(e.data.selector);
    } else if (e.data && e.data.type === 'a11y-clear') {
      clearHighlights();
    }
  });

  window.addEventListener('load', function() {
    window.parent.postMessage({ type: 'a11y-preview-ready' }, '*');
  });
})();
</script>
`

export default function PreviewPanel({ html, baseUrl, highlightSelector }: PreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [zoom, setZoom] = useState(100)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [iframeReady, setIframeReady] = useState(false)
  const [visible, setVisible] = useState(true)

  // Build srcdoc with URL rewriting and injected highlight script
  const srcdoc = useMemo(() => {
    let content = html
    if (baseUrl) {
      content = rewriteUrls(content, baseUrl)
    }
    // Inject highlight script before </body> or at end
    if (content.toLowerCase().includes('</body>')) {
      content = content.replace(/<\/body>/i, HIGHLIGHT_SCRIPT + '</body>')
    } else {
      content = content + HIGHLIGHT_SCRIPT
    }
    return content
  }, [html, baseUrl])

  // Listen for iframe ready message
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data && e.data.type === 'a11y-preview-ready') {
        setIframeReady(true)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // Send highlight messages to iframe
  useEffect(() => {
    if (!iframeRef.current || !iframeReady) return
    const iframe = iframeRef.current
    if (highlightSelector) {
      iframe.contentWindow?.postMessage({ type: 'a11y-highlight', selector: highlightSelector }, '*')
    } else {
      iframe.contentWindow?.postMessage({ type: 'a11y-clear' }, '*')
    }
  }, [highlightSelector, iframeReady])

  // Reset iframe ready state when srcdoc changes
  useEffect(() => {
    setIframeReady(false)
  }, [srcdoc])

  const deviceWidth = device === 'desktop' ? '100%' : '375px'

  if (!visible) {
    return (
      <Card className="border border-border">
        <div className="flex items-center justify-between p-3">
          <span className="text-sm text-muted">Preview Panel</span>
          <Button variant="outline" size="sm" onClick={() => setVisible(true)}>
            Show Preview
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="border border-border flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-border gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-white">Preview</span>
          <div className="flex items-center gap-1 bg-surface rounded-md p-0.5">
            <button
              onClick={() => setDevice('desktop')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                device === 'desktop' ? 'bg-primary/20 text-primary' : 'text-muted hover:text-white'
              }`}
              title="Desktop view"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => setDevice('mobile')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                device === 'mobile' ? 'bg-primary/20 text-primary' : 'text-muted hover:text-white'
              }`}
              title="Mobile view"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted">Zoom</label>
            <input
              type="range"
              min={50}
              max={150}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-20 h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <span className="text-xs text-muted w-8">{zoom}%</span>
          </div>

          <Button variant="outline" size="sm" onClick={() => setVisible(false)}>
            Hide
          </Button>
        </div>
      </div>

      {/* Iframe container */}
      <div className="flex-1 overflow-auto bg-white relative" style={{ minHeight: '400px' }}>
        <div
          className="mx-auto h-full transition-all duration-300"
          style={{ width: deviceWidth, maxWidth: '100%' }}
        >
          <iframe
            ref={iframeRef}
            srcDoc={srcdoc}
            sandbox="allow-same-origin allow-scripts"
            className="w-full h-full border-0"
            style={{
              minHeight: '400px',
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left',
              width: `${10000 / zoom}%`,
              height: `${10000 / zoom}%`,
            }}
            title="Website preview"
          />
        </div>
      </div>
    </Card>
  )
}
