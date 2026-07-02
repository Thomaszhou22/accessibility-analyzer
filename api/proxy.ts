import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Serverless proxy for fetching any URL's HTML content.
 * Server-side requests bypass CORS restrictions entirely.
 *
 * Usage: /api/proxy?url=https://example.com
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers for our own frontend
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const url = req.query.url as string

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' })
  }

  // Validate URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`)
  } catch {
    return res.status(400).json({ error: 'Invalid URL' })
  }

  // Block private/internal IPs for security
  const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1']
  if (
    blockedHosts.includes(parsedUrl.hostname) ||
    parsedUrl.hostname.startsWith('10.') ||
    parsedUrl.hostname.startsWith('192.168.') ||
    parsedUrl.hostname.startsWith('172.')
  ) {
    return res.status(403).json({ error: 'Internal addresses are not allowed' })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const response = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
      },
      redirect: 'follow',
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Upstream returned HTTP ${response.status}`,
      })
    }

    const text = await response.text()

    // Limit response size to 2MB to stay within Vercel limits
    if (text.length > 2 * 1024 * 1024) {
      return res.status(413).json({ error: 'Response too large (>2MB)' })
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=60')
    return res.status(200).send(text)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(502).json({ error: `Fetch failed: ${message}` })
  }
}
