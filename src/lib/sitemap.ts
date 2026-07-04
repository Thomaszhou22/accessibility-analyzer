/**
 * Sitemap fetching and parsing utilities
 * Multi-strategy: tries multiple sitemap paths and CORS proxies
 */

const MAX_URLS = 20
const TIMEOUT_MS = 15000

/** Candidate sitemap paths — many sites use non-standard locations */
const SITEMAP_PATHS = [
  '/sitemap.xml',
  '/sitemap_index.xml',
  '/sitemap-index.xml',
  '/sitemap1.xml',
  '/sitemap.txt',
  '/robots.txt', // often contains Sitemap: directive
]

/** CORS proxy strategies (same approach as scanner.ts) */
const PROXIES = [
  { name: 'self', prefix: (u: string) => `/api/proxy?url=${encodeURIComponent(u)}` },
  { name: 'corsproxy.io', prefix: (u: string) => `https://corsproxy.io/?url=${encodeURIComponent(u)}` },
  { name: 'allorigins', prefix: (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}` },
  { name: 'codetabs', prefix: (u: string) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}` },
]

interface FetchResult {
  text: string
  strategy: string
}

/** Try fetching a URL through multiple proxies until one succeeds */
async function fetchWithFallback(url: string): Promise<FetchResult | null> {
  for (const proxy of PROXIES) {
    const reqUrl = proxy.prefix(url)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
      const response = await fetch(reqUrl, { signal: controller.signal })
      clearTimeout(timeout)

      if (!response.ok) continue

      const text = await response.text()
      if (!text || text.length < 50) continue

      // Detect SPA fallback (Vite dev server returns index.html for /api/* in dev)
      if (text.includes('<div id="root"') || text.includes('<div id="root"')) continue
      // Detect Vercel 404 JSON that's actually a 200 with error
      if (text.startsWith('{') && text.includes('error')) continue

      return { text, strategy: proxy.name }
    } catch {
      // try next proxy
    }
  }
  return null
}

/** Parse XML sitemap */
function parseXml(xmlString: string): Document | null {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'text/xml')
    if (doc.querySelector('parsererror')) return null
    return doc
  } catch {
    return null
  }
}

/** Extract URLs from a parsed sitemap document */
function extractUrlsFromSitemap(doc: Document): string[] {
  const urls: string[] = []

  // Sitemap index -> return child sitemap URLs
  if (doc.querySelector('sitemapindex')) {
    doc.querySelectorAll('sitemap > loc').forEach((loc) => {
      const u = loc.textContent?.trim()
      if (u) urls.push(u)
    })
    return urls
  }

  // Regular sitemap
  doc.querySelectorAll('url > loc').forEach((loc) => {
    const u = loc.textContent?.trim()
    if (u) urls.push(u)
  })

  return urls
}

/** Parse text-format sitemap (one URL per line) */
function parseTextSitemap(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('http'))
}

/** Parse robots.txt for Sitemap: directives */
function extractSitemapFromRobots(text: string): string[] {
  const sitemaps: string[] = []
  for (const line of text.split('\n')) {
    const match = line.match(/^Sitemap:\s*(.+)/i)
    if (match) sitemaps.push(match[1].trim())
  }
  return sitemaps
}

/** Recursively fetch sitemaps from index files, collecting page URLs */
async function resolveSitemaps(
  sitemapUrls: string[],
  collected: string[],
  depth = 0
): Promise<string[]> {
  if (collected.length >= MAX_URLS || depth > 2) return collected

  for (const smUrl of sitemapUrls) {
    if (collected.length >= MAX_URLS) break

    const result = await fetchWithFallback(smUrl)
    if (!result) continue

    const doc = parseXml(result.text)
    if (doc) {
      const urls = extractUrlsFromSitemap(doc)
      if (doc.querySelector('sitemapindex') && urls.length > 0) {
        // Child sitemap index — recurse
        collected = await resolveSitemaps(urls, collected, depth + 1)
      } else {
        // Page URLs
        for (const u of urls) {
          if (collected.length >= MAX_URLS) break
          collected.push(u)
        }
      }
    } else {
      // Maybe text format
      const textUrls = parseTextSitemap(result.text)
      for (const u of textUrls) {
        if (collected.length >= MAX_URLS) break
        collected.push(u)
      }
    }
  }

  return collected
}

/**
 * Main entry: fetch sitemap for a domain using multi-strategy approach
 * Returns max 20 URLs
 */
export async function fetchSitemap(domain: string): Promise<string[]> {
  const normalizedDomain = domain
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')

  // Step 1: Try robots.txt first — it tells us where the sitemap actually is
  const robotsResult = await fetchWithFallback(`https://${normalizedDomain}/robots.txt`)
  if (robotsResult) {
    const declaredSitemaps = extractSitemapFromRobots(robotsResult.text)
    if (declaredSitemaps.length > 0) {
      console.info(`[sitemap] Found ${declaredSitemaps.length} sitemap(s) in robots.txt`)
      const urls = await resolveSitemaps(declaredSitemaps, [])
      if (urls.length > 0) return urls.slice(0, MAX_URLS)
    }
  }

  // Step 2: Try common sitemap paths
  for (const path of SITEMAP_PATHS) {
    if (path === '/robots.txt') continue // already tried
    const fullUrl = `https://${normalizedDomain}${path}`
    console.info(`[sitemap] Trying: ${fullUrl}`)

    const result = await fetchWithFallback(fullUrl)
    if (!result) continue

    // Text sitemap
    if (path.endsWith('.txt')) {
      const urls = parseTextSitemap(result.text)
      if (urls.length > 0) return urls.slice(0, MAX_URLS)
      continue
    }

    // XML sitemap
    const doc = parseXml(result.text)
    if (!doc) continue

    const urls = extractUrlsFromSitemap(doc)
    if (urls.length === 0) continue

    console.info(`[sitemap] Found ${urls.length} URLs via ${path}`)

    // Handle sitemap index
    if (doc.querySelector('sitemapindex')) {
      const resolved = await resolveSitemaps(urls, [])
      if (resolved.length > 0) return resolved.slice(0, MAX_URLS)
    } else {
      return urls.slice(0, MAX_URLS)
    }
  }

  // Step 3: Fallback — crawl homepage for internal links
  console.info('[sitemap] No sitemap found, crawling homepage for links')
  const homeUrl = `https://${normalizedDomain}/`
  const homeResult = await fetchWithFallback(homeUrl)
  if (!homeResult) return [homeUrl]

  const discovered = extractLinksFromHtml(homeResult.text, normalizedDomain)
  if (discovered.length === 0) return [homeUrl]

  // Always include homepage + discovered pages
  const finalUrls = [homeUrl, ...discovered].slice(0, MAX_URLS)
  console.info(`[sitemap] Discovered ${finalUrls.length} URLs from homepage links`)
  return finalUrls
}

/** Extract same-origin links from HTML */
function extractLinksFromHtml(html: string, domain: string): string[] {
  const urls: string[] = []
  const seen = new Set<string>()

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const anchors = doc.querySelectorAll('a[href]')

    for (const a of anchors) {
      const href = a.getAttribute('href')
      if (!href) continue

      // Skip fragments, javascript:, mailto:, tel:, etc.
      if (/^(#|javascript:|mailto:|tel:|data:)/i.test(href)) continue

      let fullUrl: string
      try {
        // Resolve relative URLs against the domain
        fullUrl = new URL(href, `https://${domain}/`).href
      } catch {
        continue
      }

      // Must be same domain
      let parsed: URL
      try { parsed = new URL(fullUrl) } catch { continue }
      if (parsed.hostname !== domain && !parsed.hostname.endsWith(`.${domain}`)) continue

      // Must be http(s)
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') continue

      // Skip assets and non-page URLs
      if (/\.(jpg|jpeg|png|gif|svg|css|js|ico|woff|woff2|ttf|eot|pdf|zip|rar|exe|dmg|mp4|mp3|avi|mov)(\?|#|$)/i.test(parsed.pathname)) continue

      // Normalize: remove fragment
      parsed.hash = ''
      const clean = parsed.href

      if (!seen.has(clean)) {
        seen.add(clean)
        urls.push(clean)
      }

      if (urls.length >= MAX_URLS - 1) break
    }
  } catch {
    // ignore parse errors
  }

  return urls
}
