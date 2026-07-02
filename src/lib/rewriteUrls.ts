/**
 * Rewrite relative URLs in an HTML string to absolute URLs based on a base URL.
 * Handles src, href, action attributes. Skips data:, javascript:, #, and absolute URLs.
 */
export function rewriteUrls(html: string, baseUrl: string): string {
  if (!baseUrl) return html

  let base: URL
  try {
    base = new URL(baseUrl)
  } catch {
    return html
  }

  // Match attributes like src="...", href="...", action="..."
  // Handles both single and double quotes
  const attrPattern = /(\b(?:src|href|action)\s*=\s*)(["'])([^"']*?)\2/gi

  return html.replace(attrPattern, (match, prefix, quote, value) => {
    const trimmed = value.trim()

    // Skip empty, anchors, data URIs, javascript:, mailto:, tel:, blob:
    if (
      !trimmed ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('javascript:') ||
      trimmed.startsWith('mailto:') ||
      trimmed.startsWith('tel:') ||
      trimmed.startsWith('blob:')
    ) {
      return match
    }

    try {
      // Handle protocol-relative URLs (//cdn.example.com/path)
      if (trimmed.startsWith('//')) {
        const absolute = `${base.protocol}${trimmed}`
        return `${prefix}${quote}${absolute}${quote}`
      }

      // Use URL constructor to resolve relative URLs
      const resolved = new URL(trimmed, base.href)
      return `${prefix}${quote}${resolved.href}${quote}`
    } catch {
      // If URL parsing fails, leave unchanged
      return match
    }
  })
}
