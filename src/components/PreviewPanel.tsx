import { useState, useRef, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { rewriteUrls } from '@/lib/rewriteUrls'

interface PreviewPanelProps {
  html: string
  baseUrl: string | null
  highlightSelector: string | null
  highlightLabel?: string | null
  onNavigate?: (url: string) => void
}

const HIGHLIGHT_SCRIPT = `
<style>
@keyframes a11y-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
  50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
}
@keyframes a11y-slide-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes a11y-backdrop-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
<script>
(function() {
  function clearHighlights() {
    document.querySelectorAll('.a11y-hl-overlay, .a11y-hl-label, .a11y-hl-backdrop').forEach(function(el) { el.remove(); });
    document.querySelectorAll('*').forEach(function(el) {
      if (el.style.outline === '3px solid rgb(239, 68, 68)' || el.style.outline === '3px solid #ef4444') {
        el.style.outline = '';
        el.style.outlineOffset = '';
      }
    });
  }

  function highlightElement(selector, labelText) {
    clearHighlights();
    var el;
    try {
      el = document.querySelector(selector);
    } catch(e) {
      return;
    }
    if (!el) return;

    // Scroll into view first, then calculate position
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Wait for scroll to complete before positioning
    setTimeout(function() {
      var rect = el.getBoundingClientRect();
      var scrollY = window.scrollY || window.pageYOffset;
      var scrollX = window.scrollX || window.pageXOffset;

      // Dim the rest of the page - use viewport height for better coverage
      var backdrop = document.createElement('div');
      backdrop.className = 'a11y-hl-backdrop';
      var pageHeight = Math.max(document.documentElement.scrollHeight, document.documentElement.offsetHeight, window.innerHeight);
      backdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: ' + pageHeight + 'px; background: rgba(0, 0, 0, 0.45); pointer-events: none; z-index: 2147483644; animation: a11y-backdrop-in 0.2s ease;';
      document.body.appendChild(backdrop);

      // Main highlight box
      var overlay = document.createElement('div');
      overlay.className = 'a11y-hl-overlay';
      var padding = 4;
      overlay.style.cssText = 'position: absolute; top: ' + (rect.top + scrollY - padding) + 'px; left: ' + (rect.left + scrollX - padding) + 'px; width: ' + (rect.width + padding * 2) + 'px; height: ' + (rect.height + padding * 2) + 'px; border: 3px solid #ef4444; background: rgba(239, 68, 68, 0.15); pointer-events: none; z-index: 2147483646; box-sizing: border-box; border-radius: 4px; animation: a11y-pulse 1.5s ease-in-out infinite;';
      document.body.appendChild(overlay);

      // "Hole" in backdrop for the highlighted element (bring it above backdrop)
      var cutout = document.createElement('div');
      cutout.className = 'a11y-hl-overlay';
      cutout.style.cssText = 'position: absolute; top: ' + (rect.top + scrollY - padding) + 'px; left: ' + (rect.left + scrollX - padding) + 'px; width: ' + (rect.width + padding * 2) + 'px; height: ' + (rect.height + padding * 2) + 'px; pointer-events: none; z-index: 2147483645; box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.45); border-radius: 4px;';
      document.body.appendChild(cutout);

      // Label with issue title
      var label = document.createElement('div');
      label.className = 'a11y-hl-label';
      var labelTop = rect.top + scrollY - padding - 32;
      if (labelTop < scrollY) labelTop = rect.top + scrollY + rect.height + padding + 4;
      label.style.cssText = 'position: absolute; top: ' + labelTop + 'px; left: ' + (rect.left + scrollX - padding) + 'px; background: #ef4444; color: white; font-size: 13px; font-weight: 600; font-family: system-ui, -apple-system, sans-serif; padding: 4px 12px; border-radius: 6px; z-index: 2147483647; pointer-events: none; white-space: nowrap; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5); animation: a11y-slide-in 0.3s ease; max-width: 400px; overflow: hidden; text-overflow: ellipsis;';
      label.textContent = labelText || 'Accessibility Issue';
      document.body.appendChild(label);

      el.style.outline = '3px solid #ef4444';
      el.style.outlineOffset = '2px';
      el.style.position = el.style.position || 'static';
      el.style.zIndex = '2147483645';
    }, 500);
  }

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'a11y-highlight') {
      highlightElement(e.data.selector, e.data.label);
    } else if (e.data && e.data.type === 'a11y-clear') {
      clearHighlights();
    }
  });

  // Intercept link clicks to notify parent
  document.addEventListener('click', function(e) {
    var target = e.target;
    while (target && target.tagName !== 'A') {
      target = target.parentElement;
    }
    if (target && target.tagName === 'A' && target.href) {
      var href = target.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
        e.preventDefault();
        var absoluteUrl;
        try {
          absoluteUrl = new URL(href, window.location.href).href;
        } catch(err) {
          absoluteUrl = href;
        }
        window.parent.postMessage({ type: 'a11y-navigate', url: absoluteUrl }, '*');
      }
    }
  }, true);

  // Intercept form submissions
  document.addEventListener('submit', function(e) {
    e.preventDefault();
    var form = e.target;
    var action = form.action || window.location.href;
    var method = (form.method || 'GET').toUpperCase();
    
    if (method === 'GET') {
      var formData = new FormData(form);
      var params = new URLSearchParams(formData);
      var searchUrl;
      try {
        searchUrl = new URL(action);
        params.forEach(function(value, key) {
          searchUrl.searchParams.set(key, value);
        });
        window.parent.postMessage({ type: 'a11y-navigate', url: searchUrl.href }, '*');
      } catch(err) {
        console.warn('[a11y] Failed to build search URL:', err);
      }
    } else {
      // POST requests - just navigate to the action URL
      window.parent.postMessage({ type: 'a11y-navigate', url: action }, '*');
    }
  }, true);

  // Send ready message early to avoid zoom delay
  window.parent.postMessage({ type: 'a11y-preview-ready', width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }, '*');
})();
</script>
`

export default function PreviewPanel({ html, baseUrl, highlightSelector, highlightLabel, onNavigate }: PreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(100)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [iframeReady, setIframeReady] = useState(false)
  const [visible, setVisible] = useState(true)
  const [iframeDimensions, setIframeDimensions] = useState({ width: 0, height: 0 })

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

  // Listen for iframe ready message and navigation
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data && e.data.type === 'a11y-preview-ready') {
        setIframeReady(true)
        if (e.data.width && e.data.height) {
          setIframeDimensions({ width: e.data.width, height: e.data.height })
        }
      } else if (e.data && e.data.type === 'a11y-navigate') {
        if (onNavigate && e.data.url) {
          onNavigate(e.data.url)
        }
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [onNavigate])

  // Send highlight messages to iframe
  useEffect(() => {
    if (!iframeRef.current || !iframeReady) return
    const iframe = iframeRef.current
    if (highlightSelector && highlightSelector.trim()) {
      iframe.contentWindow?.postMessage({ type: 'a11y-highlight', selector: highlightSelector, label: highlightLabel || 'Accessibility Issue' }, '*')
    } else {
      iframe.contentWindow?.postMessage({ type: 'a11y-clear' }, '*')
    }
  }, [highlightSelector, highlightLabel, iframeReady])

  // Reset iframe ready state when srcdoc changes
  useEffect(() => {
    setIframeReady(false)
  }, [srcdoc])

  // Auto-calculate initial zoom to fit the page
  useEffect(() => {
    if (iframeReady && iframeDimensions.width > 0 && containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth
      const calculatedZoom = Math.min(100, Math.floor((containerWidth / iframeDimensions.width) * 100))
      setZoom(Math.max(50, calculatedZoom))
    }
  }, [iframeReady, iframeDimensions.width])

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
      <div ref={containerRef} className="flex-1 overflow-auto bg-white relative" style={{ minHeight: '400px' }}>
        <div
          className="mx-auto h-full transition-all duration-300"
          style={{ width: deviceWidth, maxWidth: '100%' }}
        >
          <iframe
            ref={iframeRef}
            srcDoc={srcdoc}
            sandbox="allow-same-origin allow-scripts allow-forms"
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
