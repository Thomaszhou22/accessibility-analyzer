/**
 * Sitemap fetching and parsing utilities
 */

const MAX_URLS = 20
const TIMEOUT_MS = 15000

/**
 * Fetch a URL through our proxy endpoint
 */
async function fetchViaProxy(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.text()
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Parse XML string using DOMParser
 */
function parseXml(xmlString: string): Document {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')

  // Check for parse errors
  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    throw new Error(`XML parse error: ${parseError.textContent}`)
  }

  return doc
}

/**
 * Extract URLs from a sitemap document
 */
function extractUrlsFromSitemap(doc: Document): string[] {
  const urls: string[] = []

  // Check if this is a sitemap index
  const sitemapIndex = doc.querySelector('sitemapindex')
  if (sitemapIndex) {
    // This is a sitemap index, return sitemap URLs
    const sitemaps = doc.querySelectorAll('sitemap > loc')
    sitemaps.forEach((loc) => {
      const url = loc.textContent?.trim()
      if (url) {
        urls.push(url)
      }
    })
    return urls
  }

  // This is a regular sitemap, extract page URLs
  const urlElements = doc.querySelectorAll('url > loc')
  urlElements.forEach((loc) => {
    const url = loc.textContent?.trim()
    if (url) {
      urls.push(url)
    }
  })

  return urls
}

/**
 * Fetch and parse sitemap for a domain
 * Handles both sitemap index files and regular sitemaps
 * Returns max 20 URLs
 */
export async function fetchSitemap(domain: string): Promise<string[]> {
  // Normalize domain
  const normalizedDomain = domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
  const sitemapUrl = `https://${normalizedDomain}/sitemap.xml`

  console.info(`[sitemap] Fetching sitemap from: ${sitemapUrl}`)

  const xml = await fetchViaProxy(sitemapUrl)
  const doc = parseXml(xml)
  const urls = extractUrlsFromSitemap(doc)

  console.info(`[sitemap] Found ${urls.length} URLs in sitemap`)

  // Check if this is a sitemap index
  const isSitemapIndex = doc.querySelector('sitemapindex') !== null

  if (isSitemapIndex && urls.length > 0) {
    console.info(`[sitemap] Detected sitemap index, fetching child sitemaps...`)

    // Fetch child sitemaps and collect URLs
    const allUrls: string[] = []

    for (const sitemapUrl of urls) {
      if (allUrls.length >= MAX_URLS) {
        console.info(`[sitemap] Reached max URL limit (${MAX_URLS})`)
        break
      }

      try {
        console.info(`[sitemap] Fetching child sitemap: ${sitemapUrl}`)
        const childXml = await fetchViaProxy(sitemapUrl)
        const childDoc = parseXml(childXml)
        const childUrls = extractUrlsFromSitemap(childDoc)

        // Add URLs up to the limit
        for (const url of childUrls) {
          if (allUrls.length >= MAX_URLS) {
            break
          }
          allUrls.push(url)
        }

        console.info(`[sitemap] Collected ${childUrls.length} URLs from child sitemap`)
      } catch (err) {
        console.warn(`[sitemap] Failed to fetch child sitemap ${sitemapUrl}:`, err)
      }
    }

    console.info(`[sitemap] Total URLs collected: ${allUrls.length}`)
    return allUrls
  }

  // Regular sitemap, limit to MAX_URLS
  const limitedUrls = urls.slice(0, MAX_URLS)
  console.info(`[sitemap] Returning ${limitedUrls.length} URLs`)
  return limitedUrls
}
