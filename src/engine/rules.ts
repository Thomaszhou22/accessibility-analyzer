import type { Rule, Issue, WCAGLevel } from './types'

let issueCounter = 0

function makeId(): string {
  issueCounter++
  return `issue-${Date.now()}-${issueCounter}`
}

function truncateHtml(html: string, maxLen = 200): string {
  const trimmed = html.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= maxLen) return trimmed
  return trimmed.slice(0, maxLen) + '...'
}

function getElementHtml(el: Element): string {
  return truncateHtml(el.outerHTML)
}

function buildSelector(el: Element): string {
  const parts: string[] = []
  let current: Element | null = el

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.tagName.toLowerCase()

    if (current.id) {
      selector += `#${current.id}`
      parts.unshift(selector)
      break
    }

    const classes = Array.from(current.classList)
    if (classes.length > 0) {
      selector += `.${classes.join('.')}`
    }

    const parent = current.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (c) => c.tagName === current!.tagName
      )
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1
        selector += `:nth-of-type(${index})`
      }
    }

    parts.unshift(selector)
    current = current.parentElement
  }

  return parts.join(' > ')
}

const wcagCriteriaMap: Record<string, string[]> = {
  'img-alt': ['1.1.1 Non-text Content'],
  'color-contrast': ['1.4.3 Contrast (Minimum)'],
  'form-label': ['1.3.1 Info and Relationships', '3.3.2 Labels or Instructions', '4.1.2 Name, Role, Value'],
  'button-text': ['4.1.2 Name, Role, Value'],
  'link-text': ['2.4.4 Link Purpose (In Context)', '2.4.9 Link Purpose (Link Only)'],
  'heading-order': ['1.3.1 Info and Relationships', '2.4.6 Headings and Labels'],
  'html-lang': ['3.1.1 Language of Page'],
  'empty-link': ['2.4.4 Link Purpose (In Context)', '4.1.2 Name, Role, Value'],
  'tabindex': ['2.4.3 Focus Order'],
  'iframe-title': ['4.1.2 Name, Role, Value'],
  'duplicate-id': ['4.1.1 Parsing'],
  'meta-viewport': ['1.4.4 Resize Text'],
  'aria-valid': ['4.1.2 Name, Role, Value'],
  'list-structure': ['1.3.1 Info and Relationships'],
  'media-caption': ['1.2.2 Captions (Prerecorded)'],
  'html-title': ['2.4.2 Page Titled'],
  'table-scope': ['1.3.1 Info and Relationships'],
  'empty-heading': ['1.3.1 Info and Relationships', '2.4.6 Headings and Labels'],
  'accesskey': ['2.1.4 Character Key Shortcuts'],
  'lang-valid': ['3.1.1 Language of Page'],
}

function createIssue(
  ruleId: string,
  level: Issue['level'],
  wcagLevel: WCAGLevel,
  title: string,
  description: string,
  element: Element,
  recommendation: string,
  fixCode?: string,
  autoFix?: string
): Issue {
  const elementIndex = element.hasAttribute('data-a11y-idx')
    ? parseInt(element.getAttribute('data-a11y-idx')!, 10)
    : undefined
  return {
    id: makeId(),
    ruleId,
    level,
    wcagLevel,
    wcagCriteria: wcagCriteriaMap[ruleId] || [],
    title,
    description,
    elementSelector: buildSelector(element),
    elementHtml: getElementHtml(element),
    recommendation,
    fixCode,
    autoFix,
    elementIndex,
  }
}

// ---------- Rule 1: img-alt ----------
const imgAltRule: Rule = {
  id: 'img-alt',
  name: 'Image Alt Text',
  description:
    'All images must have an alt attribute. Decorative images should use alt="".',
  wcagLevel: 'A',
  evaluate(doc: Document): Issue[] {
    const issues: Issue[] = []
    const images = doc.querySelectorAll('img')

    images.forEach((img) => {
      if (!img.hasAttribute('alt')) {
        issues.push(
          createIssue(
            'img-alt',
            'error',
            'A',
            'Image missing alt attribute',
            `Image src="${img.getAttribute('src') || ''}" has no alt attribute. Screen readers cannot describe this image to users.`,
            img,
            'Add an alt attribute that describes the image content. For decorative images, use alt="".',
            `<img src="photo.jpg" alt="Description of the image content" />
<img src="decorative.png" alt="" role="presentation" />`,
            `alt=""`
          )
        )
      } else if (img.getAttribute('alt')?.trim() === '') {
        if (img.getAttribute('role') === null || img.getAttribute('role') !== 'presentation') {
          issues.push(
            createIssue(
              'img-alt',
              'warning',
              'A',
              'Image has empty alt without decorative role',
              'Image has an empty alt attribute but is not marked as decorative (role="presentation").',
              img,
              'If this image is decorative, add role="presentation". If it conveys meaning, provide descriptive alt text.',
              `<img src="decorative.png" alt="" role="presentation" />`,
              'role="presentation"'
            )
          )
        }
      }
    })

    return issues
  },
}


// ---------- Rule 2: color-contrast ----------
// Checks inline styles, <style> tag CSS rules, inherited styles, and HTML color attributes.
const colorContrastRule: Rule = {
  id: 'color-contrast',
  name: 'Color Contrast',
  description:
    'Text must have sufficient color contrast against its background. WCAG AA requires a ratio of at least 4.5:1 for normal text.',
  wcagLevel: 'AA',
  evaluate(doc: Document): Issue[] {
    const issues: Issue[] = []

    function parseColor(color: string): [number, number, number] | null {
      if (!color || color === 'inherit' || color === 'initial' || color === 'unset' || color === 'transparent') {
        return null
      }
      const hexMatch = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
      if (hexMatch) {
        const hex = hexMatch[1]
        if (hex.length === 3) {
          return [
            parseInt(hex[0] + hex[0], 16),
            parseInt(hex[1] + hex[1], 16),
            parseInt(hex[2] + hex[2], 16),
          ]
        }
        return [
          parseInt(hex.slice(0, 2), 16),
          parseInt(hex.slice(2, 4), 16),
          parseInt(hex.slice(4, 6), 16),
        ]
      }
      const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i)
      if (rgbMatch) {
        return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])]
      }
      const namedColors: Record<string, [number, number, number]> = {
        black: [0, 0, 0], white: [255, 255, 255], red: [255, 0, 0],
        green: [0, 128, 0], blue: [0, 0, 255], yellow: [255, 255, 0],
        gray: [128, 128, 128], grey: [128, 128, 128], silver: [192, 192, 192],
        maroon: [128, 0, 0], navy: [0, 0, 128], purple: [128, 0, 128],
        teal: [0, 128, 128], aqua: [0, 255, 255], fuchsia: [255, 0, 255],
        lime: [0, 255, 0], olive: [128, 128, 0], orange: [255, 165, 0],
      }
      return namedColors[color.toLowerCase()] || null
    }

    function getLuminance([r, g, b]: [number, number, number]): number {
      const [rs, gs, bs] = [r, g, b].map((c) => {
        const s = c / 255
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
    }

    function getContrastRatio(
      fg: [number, number, number],
      bg: [number, number, number]
    ): number {
      const l1 = getLuminance(fg)
      const l2 = getLuminance(bg)
      const lighter = Math.max(l1, l2)
      const darker = Math.min(l1, l2)
      return (lighter + 0.05) / (darker + 0.05)
    }

    // Parse <style> tags to build a simple CSS rule map
    const styleRules: { selector: string; color?: string; bgColor?: string }[] = []
    const styleTags = doc.querySelectorAll('style')
    styleTags.forEach((styleTag) => {
      const cssText = styleTag.textContent || ''
      const ruleRegex = /([^{}]+)\{([^}]*)\}/g
      let match: RegExpExecArray | null
      while ((match = ruleRegex.exec(cssText)) !== null) {
        const selectorPart = match[1].trim()
        const declarations = match[2].trim()
        const colorMatch = declarations.match(/(?:^|;|\s)color\s*:\s*([^;]+)/i)
        const bgMatch = declarations.match(/background(?:-color)?\s*:\s*([^;]+)/i)
        if (colorMatch || bgMatch) {
          selectorPart.split(',').forEach((sel) => {
            styleRules.push({
              selector: sel.trim(),
              color: colorMatch?.[1]?.trim(),
              bgColor: bgMatch?.[1]?.trim(),
            })
          })
        }
      }
    })

    function getEffectiveStyles(el: Element): { color?: string; bgColor?: string } {
      let color: string | undefined
      let bgColor: string | undefined

      // 1. Inline style (highest priority)
      const inlineStyle = el.getAttribute('style') || ''
      const inlineColor = inlineStyle.match(/(?:^|;|\s)color\s*:\s*([^;]+)/i)
      const inlineBg = inlineStyle.match(/background(?:-color)?\s*:\s*([^;]+)/i)
      if (inlineColor) color = inlineColor[1].trim()
      if (inlineBg) bgColor = inlineBg[1].trim()

      // 2. <style> tag rules (last match wins, simulating cascade)
      if (!color || !bgColor) {
        for (const rule of styleRules) {
          try {
            if (el.matches(rule.selector)) {
              if (!color && rule.color) color = rule.color
              if (!bgColor && rule.bgColor) bgColor = rule.bgColor
            }
          } catch {
            // Invalid selector, skip
          }
        }
      }

      // 3. HTML color attributes (text, bgcolor)
      if (!color) {
        const textAttr = el.getAttribute('text')
        if (textAttr) color = textAttr
      }
      if (!bgColor) {
        const bgcolorAttr = el.getAttribute('bgcolor')
        if (bgcolorAttr) bgColor = bgcolorAttr
      }

      return { color, bgColor }
    }

    // Walk up the tree for inherited values
    function getInheritedStyles(el: Element): { color?: string; bgColor?: string } {
      let color: string | undefined
      let bgColor: string | undefined
      let parent: Element | null = el.parentElement
      while (parent && (!color || !bgColor)) {
        const parentStyles = getEffectiveStyles(parent)
        if (!color && parentStyles.color) color = parentStyles.color
        if (!bgColor && parentStyles.bgColor) bgColor = parentStyles.bgColor
        parent = parent.parentElement
      }
      if (!color) color = '#000000'
      if (!bgColor) bgColor = '#ffffff'
      return { color, bgColor }
    }

    const textElements = doc.querySelectorAll(
      'p, span, a, button, label, h1, h2, h3, h4, h5, h6, li, td, th, div, blockquote, caption, figcaption'
    )

    const checked = new Set<Element>()
    textElements.forEach((el) => {
      if (checked.has(el)) return
      checked.add(el)

      let { color, bgColor } = getEffectiveStyles(el)
      if (!color || !bgColor) {
        const inherited = getInheritedStyles(el)
        if (!color) color = inherited.color
        if (!bgColor) bgColor = inherited.bgColor
      }

      if (color && bgColor) {
        const fg = parseColor(color)
        const bg = parseColor(bgColor)
        if (fg && bg) {
          const ratio = getContrastRatio(fg, bg)
          if (ratio < 4.5) {
            issues.push(
              createIssue(
                'color-contrast',
                'warning',
                'AA',
                `Insufficient color contrast (${ratio.toFixed(2)}:1)`,
                `Text color and background color have a contrast ratio of ${ratio.toFixed(2)}:1, which is below the WCAG AA minimum of 4.5:1.`,
                el,
                'Increase the contrast between text and background colors to at least 4.5:1 for normal text or 3:1 for large text.',
                `/* Before: low contrast */\n.text { color: #999; background: #fff; }\n\n/* After: WCAG AA compliant (4.5:1+) */\n.text { color: #595959; background: #fff; }`,
              )
            )
          }
        }
      }
    })

    return issues
  },
}

// ---------- Rule 3: form-label ----------
const formLabelRule: Rule = {
  id: 'form-label',
  name: 'Form Label',
  description:
    'All form controls must have an associated label element or aria-label attribute.',
  wcagLevel: 'A',
  evaluate(doc: Document): Issue[] {
    const issues: Issue[] = []
    const controls = doc.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), select, textarea'
    )

    controls.forEach((control) => {
      const inputEl = control as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

      // Check for associated label via for/id
      const id = inputEl.id
      const hasLabelById =
        id && doc.querySelector(`label[for="${CSS.escape(id)}"]`)

      // Check for wrapping label
      const hasWrappingLabel = inputEl.closest('label')

      // Check for aria-label or aria-labelledby
      const hasAriaLabel = inputEl.hasAttribute('aria-label')
      const hasAriaLabelledby = inputEl.hasAttribute('aria-labelledby')
      let hasValidLabelledby = false
      if (hasAriaLabelledby) {
        const labelledby = inputEl.getAttribute('aria-labelledby')
        if (labelledby) {
          const targetIds = labelledby.split(/\s+/)
          hasValidLabelledby = targetIds.some((tid) => doc.getElementById(tid) !== null)
        }
      }

      // Check for title attribute as fallback
      const hasTitle = inputEl.hasAttribute('title') && inputEl.getAttribute('title')?.trim() !== ''

      if (
        !hasLabelById &&
        !hasWrappingLabel &&
        !hasAriaLabel &&
        !hasValidLabelledby &&
        !hasTitle
      ) {
        issues.push(
          createIssue(
            'form-label',
            'error',
            'A',
            `Form control missing label`,
            `${inputEl.tagName.toLowerCase()}${inputEl.getAttribute('type') ? `[type="${inputEl.getAttribute('type')}"]` : ''}${inputEl.getAttribute('name') ? `[name="${inputEl.getAttribute('name')}"]` : ''} has no associated label, aria-label, or title attribute.`,
            inputEl,
              'Add a <label> element with a matching for attribute, or wrap the control in a <label>, or add an aria-label attribute describing the field purpose.',
              `<!-- HTML: label with for attribute -->
<label for="email">Email address</label>
<input type="email" id="email" name="email" />

<!-- HTML: wrapping label -->
<label>
  Email address
  <input type="email" name="email" />
</label>

{/* React: htmlFor */}
<label htmlFor="email">Email address</label>
<input type="email" id="email" name="email" />`,
          )
        )
      }
    })

    return issues
  },
}

// ---------- Rule 4: button-text ----------
const buttonTextRule: Rule = {
  id: 'button-text',
  name: 'Button Text',
  description:
    'Buttons must have discernible text content or an aria-label for screen reader users.',
  wcagLevel: 'A',
  evaluate(doc: Document): Issue[] {
    const issues: Issue[] = []
    const buttons = doc.querySelectorAll('button, [role="button"]')

    buttons.forEach((button) => {
      const textContent = button.textContent?.trim()
      const hasAriaLabel = button.hasAttribute('aria-label') && button.getAttribute('aria-label')?.trim() !== ''
      const hasAriaLabelledby = button.hasAttribute('aria-labelledby')
      let hasValidLabelledby = false
      if (hasAriaLabelledby) {
        const labelledby = button.getAttribute('aria-labelledby')
        if (labelledby) {
          const targetIds = labelledby.split(/\s+/)
          hasValidLabelledby = targetIds.some((tid) => doc.getElementById(tid) !== null)
        }
      }
      const hasTitle = button.hasAttribute('title') && button.getAttribute('title')?.trim() !== ''
      const hasImgAlt = button.querySelector('img[alt]:not([alt=""])')

      if (!textContent && !hasAriaLabel && !hasValidLabelledby && !hasTitle && !hasImgAlt) {
        issues.push(
          createIssue(
            'button-text',
            'error',
            'A',
            'Button has no accessible name',
            'Button element has no text content, aria-label, title, or image with alt text. Screen readers cannot announce its purpose.',
            button,
            'Add descriptive text inside the button, or add an aria-label attribute that describes the button action.',
            `<button aria-label="Close dialog">
  <svg>...</svg>
</button>

<button aria-label="Search">
  <img src="search-icon.svg" alt="" />
</button>`,
            `aria-label="${button.getAttribute('class')?.includes('close') ? 'Close' : button.getAttribute('class')?.includes('search') ? 'Search' : 'Action'}"`
          )
        )
      }
    })

    return issues
  },
}

// ---------- Rule 5: link-text ----------
const linkTextRule: Rule = {
  id: 'link-text',
  name: 'Link Text Quality',
  description:
    'Link text should be descriptive and meaningful. Avoid vague text like "click here" or "read more".',
  wcagLevel: 'AAA',
  evaluate(doc: Document): Issue[] {
    const issues: Issue[] = []
    const vagueTexts = [
      '点击这里',
      '点击此处',
      '更多',
      '了解更多',
      '查看更多',
      '阅读更多',
      'click here',
      'read more',
      'more',
      'here',
      'link',
      'this link',
      '继续阅读',
      '详情',
      '更多详情',
    ]

    const links = doc.querySelectorAll('a[href]')

    links.forEach((link) => {
      const text = link.textContent?.trim().toLowerCase() || ''

      if (vagueTexts.some((vague) => text === vague || text === vague.toLowerCase())) {
        issues.push(
          createIssue(
            'link-text',
            'warning',
            'AAA',
            `Vague link text: "${link.textContent?.trim()}"`,
            'Link text is not descriptive enough. Users navigating by link list cannot understand the destination from the text alone.',
            link,
            'Replace vague link text with descriptive text that explains the link destination or purpose. For example, instead of "click here", use "Read our accessibility guide".',
            `<!-- Before: vague -->
<a href="/guide">Click here</a>

<!-- After: descriptive -->
<a href="/guide">Read our accessibility guide</a>`,
          )
        )
      }

      if (text === '') {
        // Empty link text is handled by empty-link rule, skip here
        return
      }
    })

    return issues
  },
}

// ---------- Rule 6: heading-order ----------
const headingOrderRule: Rule = {
  id: 'heading-order',
  name: 'Heading Order',
  description:
    'Headings should be properly nested without skipping levels (e.g., do not go from h1 to h3).',
  wcagLevel: 'A',
  evaluate(doc: Document): Issue[] {
    const issues: Issue[] = []
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6')

    let previousLevel = 0

    headings.forEach((heading) => {
      const currentLevel = parseInt(heading.tagName[1])

      if (previousLevel > 0 && currentLevel > previousLevel + 1) {
        issues.push(
          createIssue(
            'heading-order',
            'warning',
            'A',
            `Heading level skipped from h${previousLevel} to h${currentLevel}`,
            `Heading levels should not skip. An h${previousLevel} is followed by h${currentLevel}, skipping h${previousLevel + 1}.`,
            heading,
            `Use h${previousLevel + 1} instead of h${currentLevel}, or restructure the heading hierarchy to avoid skipping levels.`,
            `<!-- Before: skipped level -->
<h${previousLevel}>Section</h${previousLevel}>
<h${currentLevel}>Subsection</h${currentLevel}>

<!-- After: proper hierarchy -->
<h${previousLevel}>Section</h${previousLevel}>
<h${previousLevel + 1}>Subsection</h${previousLevel + 1}>`,
            `<h${previousLevel + 1}>${heading.textContent}</h${previousLevel + 1}>`
          )
        )
      }

      previousLevel = currentLevel
    })

    return issues
  },
}

// ---------- Rule 7: html-lang ----------
const htmlLangRule: Rule = {
  id: 'html-lang',
  name: 'HTML Language',
  description:
    'The html element must have a lang attribute to declare the page language.',
  wcagLevel: 'A',
  evaluate(doc: Document): Issue[] {
    const issues: Issue[] = []
    const htmlEl = doc.documentElement

    if (!htmlEl.hasAttribute('lang')) {
      issues.push(
        createIssue(
          'html-lang',
          'error',
          'A',
          'Missing lang attribute on <html> element',
          'The html element does not have a lang attribute. Screen readers need this to determine the correct pronunciation and language settings.',
          htmlEl,
          'Add a lang attribute to the html element indicating the page language. For example: lang="en" for English or lang="zh-CN" for Simplified Chinese.',
          `<!-- English -->
<html lang="en">

<!-- Simplified Chinese -->
<html lang="zh-CN">

<!-- Japanese -->
<html lang="ja">`,
          'lang="en"'
        )
      )
    } else if (htmlEl.getAttribute('lang')?.trim() === '') {
      issues.push(
        createIssue(
          'html-lang',
          'error',
          'A',
          'Empty lang attribute on <html> element',
          'The html element has a lang attribute but its value is empty. A valid language code is required.',
          htmlEl,
          'Provide a valid language code. For example: lang="en" or lang="zh-CN".',
          `<!-- Before: empty lang -->
<html lang="">

<!-- After: valid language code -->
<html lang="en">`,
          'lang="en"'
        )
      )
    }

    return issues
  },
}

// ---------- Rule 8: empty-link ----------
const emptyLinkRule: Rule = {
  id: 'empty-link',
  name: 'Empty Link',
  description:
    'Links must have text content or an accessible name. Empty links are not usable by screen readers.',
  wcagLevel: 'A',
  evaluate(doc: Document): Issue[] {
    const issues: Issue[] = []
    const links = doc.querySelectorAll('a[href]')

    links.forEach((link) => {
      const text = link.textContent?.trim()
      const hasAriaLabel = link.hasAttribute('aria-label') && link.getAttribute('aria-label')?.trim() !== ''
      const hasAriaLabelledby = link.hasAttribute('aria-labelledby')
      let hasValidLabelledby = false
      if (hasAriaLabelledby) {
        const labelledby = link.getAttribute('aria-labelledby')
        if (labelledby) {
          const targetIds = labelledby.split(/\s+/)
          hasValidLabelledby = targetIds.some((tid) => doc.getElementById(tid) !== null)
        }
      }
      const hasTitle = link.hasAttribute('title') && link.getAttribute('title')?.trim() !== ''
      const hasImgAlt = link.querySelector('img[alt]:not([alt=""])')

      if (!text && !hasAriaLabel && !hasValidLabelledby && !hasTitle && !hasImgAlt) {
        issues.push(
          createIssue(
            'empty-link',
            'error',
            'A',
            'Empty link with no accessible name',
            'Link has no text content, image with alt text, aria-label, or title. Screen readers cannot announce its purpose.',
            link,
            'Add text content inside the link, or provide an aria-label, or add a title attribute describing the link destination.',
            `<!-- Link with visible text -->
<a href="/about">About our company</a>

<!-- Icon-only link with aria-label -->
<a href="/cart" aria-label="Shopping cart">
  <svg>...</svg>
</a>`,
          )
        )
      }
    })

    return issues
  },
}

// ---------- Rule 9: tabindex ----------
const tabindexRule: Rule = {
  id: 'tabindex',
  name: 'Positive Tabindex',
  description:
    'Avoid positive tabindex values as they disrupt the natural keyboard navigation order.',
  wcagLevel: 'A',
  evaluate(doc: Document): Issue[] {
    const issues: Issue[] = []
    const elements = doc.querySelectorAll('[tabindex]')

    elements.forEach((el) => {
      const tabindex = parseInt(el.getAttribute('tabindex') || '0')

      if (tabindex > 0) {
        issues.push(
          createIssue(
            'tabindex',
            'warning',
            'A',
            `Positive tabindex value: ${tabindex}`,
            `Element has tabindex="${tabindex}". Positive tabindex values disrupt the natural tab order of the page, making keyboard navigation confusing and unpredictable.`,
            el,
            'Use tabindex="0" to make the element focusable in DOM order, or tabindex="-1" to make it focusable only programmatically. Restructure the DOM order instead of using positive tabindex.',
            `<!-- Before: positive tabindex (bad) -->
<div tabindex="5">Focusable content</div>

<!-- After: natural DOM order -->
<div tabindex="0">Focusable content</div>`,
          )
        )
      }
    })

    return issues
  },
}

// ---------- Rule 10: iframe-title ----------
const iframeTitleRule: Rule = {
  id: 'iframe-title',
  name: 'Iframe Title',
  description:
    'Iframe elements must have a title attribute to describe their content to screen reader users.',
  wcagLevel: 'A',
  evaluate(doc: Document): Issue[] {
    const issues: Issue[] = []
    const iframes = doc.querySelectorAll('iframe')

    iframes.forEach((iframe) => {
      const title = iframe.getAttribute('title')
      const hasAriaLabel = iframe.hasAttribute('aria-label') && iframe.getAttribute('aria-label')?.trim() !== ''

      if (!title?.trim() && !hasAriaLabel) {
        issues.push(
          createIssue(
            'iframe-title',
            'error',
            'A',
            'Iframe missing title attribute',
            `Iframe${iframe.getAttribute('src') ? ` (src="${iframe.getAttribute('src')}")` : ''} has no title attribute. Screen readers cannot describe the iframe content to users.`,
            iframe,
            'Add a descriptive title attribute to the iframe. For example: title="YouTube video player" or title="Google Map".',
            `<iframe
  src="https://www.youtube.com/embed/xyz"
  title="Product demo video"
  allowfullscreen
></iframe>`,
            `title="Embedded content"`
          )
        )
      }
    })

    return issues
  },
}

// ---------- Rule 11: duplicate-id ----------
const duplicateIdRule: Rule = {
  id: 'duplicate-id',
  name: 'Duplicate ID',
  description:
    'ID attributes must be unique within a page. Duplicate IDs break accessibility APIs and assistive technologies.',
  wcagLevel: 'A',
  evaluate(doc: Document): Issue[] {
    const issues: Issue[] = []
    const allElements = doc.querySelectorAll('[id]')
    const idMap = new Map<string, Element[]>()

    allElements.forEach((el) => {
      const id = el.getAttribute('id') || ''
      if (!id) return

      if (!idMap.has(id)) {
        idMap.set(id, [])
      }
      idMap.get(id)!.push(el)
    })

    idMap.forEach((elements, id) => {
      if (elements.length > 1) {
        elements.forEach((el) => {
          issues.push(
            createIssue(
              'duplicate-id',
              'error',
              'A',
              `Duplicate ID: "${id}" (${elements.length} occurrences)`,
              `The ID "${id}" appears ${elements.length} times on the page. IDs must be unique. This can cause issues with label associations, ARIA references, and assistive technologies.`,
              el,
              `Make each ID unique. Consider using a suffix or numbering scheme, e.g. "${id}-1", "${id}-2".`,
              `<!-- Before: duplicate IDs -->
<div id="${id}">First</div>
<div id="${id}">Second</div>

<!-- After: unique IDs -->
<div id="${id}-1">First</div>
<div id="${id}-2">Second</div>`,
            )
          )
        })
      }
    })

    return issues
  },
}

// ---------- Rule 12: meta-viewport ----------
const metaViewportRule: Rule = {
  id: 'meta-viewport',
  name: 'Meta Viewport Zoom',
  description:
    'Users must be able to zoom the page. Disabling user scaling violates WCAG.',
  wcagLevel: 'AA',
  evaluate(doc: Document): Issue[] {
    const issues: Issue[] = []
    const viewport = doc.querySelector('meta[name="viewport"]')

    if (viewport) {
      const content = viewport.getAttribute('content') || ''
      const userScalable = content.match(/user-scalable\s*=\s*(\w+)/i)
      const maximumScale = content.match(/maximum-scale\s*=\s*([\d.]+)/i)

      if (userScalable && userScalable[1].toLowerCase() === 'no') {
        issues.push(
          createIssue(
            'meta-viewport',
            'error',
            'AA',
            'User zooming disabled (user-scalable=no)',
            'The meta viewport tag sets user-scalable=no, which prevents users from zooming the page. Users with low vision need to zoom to read content.',
            viewport,
            'Remove user-scalable=no from the viewport meta tag, or set it to user-scalable=yes.',
            `<!-- Before: zoom disabled -->
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">

<!-- After: zoom enabled -->
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=yes">`,
            content.replace(/user-scalable\s*=\s*no/i, 'user-scalable=yes')
          )
        )
      }

      if (maximumScale && parseFloat(maximumScale[1]) < 5) {
        issues.push(
          createIssue(
            'meta-viewport',
            'warning',
            'AA',
            `Maximum zoom too low (maximum-scale=${maximumScale[1]})`,
            `The meta viewport tag sets maximum-scale=${maximumScale[1]}, which limits zoom below the recommended minimum of 5. Users should be able to zoom to at least 500%.`,
            viewport,
            'Increase maximum-scale to at least 5, or remove the maximum-scale restriction entirely.',
            `<!-- Before: limited zoom -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=${maximumScale[1]}">

<!-- After: sufficient zoom -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">`,
          )
        )
      }
    }

    return issues
  },
}

// ---------- Rule 13: aria-valid ----------
const ariaValidRule: Rule = {
  id: 'aria-valid',
  name: 'ARIA Validity',
  description:
    'ARIA attributes must be used correctly with valid role values and valid ID references.',
  wcagLevel: 'A',
  evaluate(doc: Document): Issue[] {
    const issues: Issue[] = []
    const validRoles = new Set([
      'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
      'cell', 'checkbox', 'columnheader', 'combobox', 'complementary',
      'contentinfo', 'definition', 'dialog', 'directory', 'document',
      'feed', 'figure', 'form', 'grid', 'gridcell', 'group', 'heading',
      'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main',
      'marquee', 'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox',
      'menuitemradio', 'navigation', 'none', 'note', 'option', 'presentation',
      'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup',
      'rowheader', 'scrollbar', 'search', 'searchbox', 'separator', 'slider',
      'spinbutton', 'status', 'switch', 'tab', 'table', 'tablist', 'tabpanel',
      'term', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treegrid',
      'treeitem', 'doc-backlink', 'doc-bibliography', 'doc-biblioref',
      'doc-chapter', 'doc-colophon', 'doc-conclusion', 'doc-cover',
      'doc-credit', 'doc-credits', 'doc-dedication', 'doc-endnote',
      'doc-endnotes', 'doc-epigraph', 'doc-epilogue', 'doc-errata',
      'doc-example', 'doc-footnote', 'doc-foreword', 'doc-glossary',
      'doc-glossref', 'doc-index', 'doc-introduction', 'doc-noteref',
      'doc-notice', 'doc-pagebreak', 'doc-pagelist', 'doc-part',
      'doc-preface', 'doc-prologue', 'doc-pullquote', 'doc-qna',
      'doc-subtitle', 'doc-tip', 'doc-toc',
    ])

    // Check invalid roles
    const elementsWithRole = doc.querySelectorAll('[role]')
    elementsWithRole.forEach((el) => {
      const role = el.getAttribute('role') || ''
      const roles = role.split(/\s+/).filter(Boolean)

      roles.forEach((r) => {
        if (!validRoles.has(r)) {
          issues.push(
            createIssue(
              'aria-valid',
              'error',
              'A',
              `Invalid ARIA role: "${r}"`,
              `The role "${r}" is not a valid WAI-ARIA role. Assistive technologies may not recognize this element correctly.`,
              el,
              `Use a valid ARIA role. Refer to the WAI-ARIA specification for the complete list of valid roles.`,
              `<!-- Common valid ARIA roles -->
<div role="button">Click me</div>
<div role="navigation">...</div>
<div role="alert">Important message</div>
<div role="dialog" aria-label="Settings">...</div>
<div role="tablist">...</div>`,
            )
          )
        }
      })
    })

    // Check aria-labelledby references
    const labelledbyEls = doc.querySelectorAll('[aria-labelledby]')
    labelledbyEls.forEach((el) => {
      const ref = el.getAttribute('aria-labelledby') || ''
      const refIds = ref.split(/\s+/).filter(Boolean)

      refIds.forEach((refId) => {
        if (!doc.getElementById(refId)) {
          issues.push(
            createIssue(
              'aria-valid',
              'error',
              'A',
              `aria-labelledby references non-existent ID: "${refId}"`,
              `The aria-labelledby attribute references an element with ID "${refId}", but no such element exists on the page.`,
              el,
              `Ensure the aria-labelledby attribute contains the correct ID, or add an element with that ID to the page.`,
              `<h2 id="dialog-title">Settings</h2>
<div role="dialog" aria-labelledby="dialog-title">
  ...
</div>`,
            )
          )
        }
      })
    })

    // Check aria-describedby references
    const describedbyEls = doc.querySelectorAll('[aria-describedby]')
    describedbyEls.forEach((el) => {
      const ref = el.getAttribute('aria-describedby') || ''
      const refIds = ref.split(/\s+/).filter(Boolean)

      refIds.forEach((refId) => {
        if (!doc.getElementById(refId)) {
          issues.push(
            createIssue(
              'aria-valid',
              'error',
              'A',
              `aria-describedby references non-existent ID: "${refId}"`,
              `The aria-describedby attribute references an element with ID "${refId}", but no such element exists on the page.`,
              el,
              `Ensure the aria-describedby attribute contains the correct ID, or add an element with that ID to the page.`,
              `<input type="email" aria-describedby="email-help" />
<p id="email-help">Enter your work email address.</p>`,
            )
          )
        }
      })
    })

    // Check aria-controls references
    const controlsEls = doc.querySelectorAll('[aria-controls]')
    controlsEls.forEach((el) => {
      const ref = el.getAttribute('aria-controls') || ''
      if (ref && !doc.getElementById(ref)) {
        issues.push(
          createIssue(
            'aria-valid',
            'warning',
            'A',
            `aria-controls references non-existent ID: "${ref}"`,
            `The aria-controls attribute references an element with ID "${ref}", but no such element exists on the page.`,
            el,
            'Ensure the aria-controls attribute contains the correct ID of the controlled element.',
            `<button aria-controls="panel-1" aria-expanded="true">Toggle</button>
<div id="panel-1" role="region">
  Controlled content
</div>`,
          )
        )
      }
    })

    return issues
  },
}

// ---------- Rule 14: list-structure ----------
const listStructureRule: Rule = {
  id: 'list-structure',
  name: 'List Structure',
  description:
    'List elements (ul, ol) should only contain li elements as direct children.',
  wcagLevel: 'A',
  evaluate(doc: Document): Issue[] {
    const issues: Issue[] = []
    const lists = doc.querySelectorAll('ul, ol')

    lists.forEach((list) => {
      const children = Array.from(list.children)

      children.forEach((child) => {
        if (child.tagName.toLowerCase() !== 'li') {
          issues.push(
            createIssue(
              'list-structure',
              'warning',
              'A',
              `Invalid direct child of <${list.tagName.toLowerCase()}>: <${child.tagName.toLowerCase()}>`,
              `List element <${list.tagName.toLowerCase()}> contains a direct child <${child.tagName.toLowerCase()}>. Only <li> elements should be direct children of list elements.`,
              child,
              `Wrap the content in a <li> element, or move it outside the list if it is not list content.`,
              `<!-- Before: invalid structure -->
<ul>
  <div>Not a list item</div>
</ul>

<!-- After: proper structure -->
<ul>
  <li>List item content</li>
  <li>Another item</li>
</ul>`,
            )
          )
        }
      })
    })

    return issues
  },
}

// ---------- Rule 15: media-caption ----------
const mediaCaptionRule: Rule = {
  id: 'media-caption',
  name: 'Media Caption',
  description:
    'Video and audio elements must provide captions or transcripts for users with hearing impairments.',
  wcagLevel: 'A',
  evaluate(doc: Document): Issue[] {
    const issues: Issue[] = []
    const videos = doc.querySelectorAll('video')
    const audios = doc.querySelectorAll('audio[controls]')

    videos.forEach((video) => {
      const tracks = video.querySelectorAll('track')
      const captionTracks = Array.from(tracks).filter(
        (t) => t.getAttribute('kind') === 'captions' || t.getAttribute('kind') === 'subtitles'
      )

      if (captionTracks.length === 0) {
        issues.push(
          createIssue(
            'media-caption',
            'warning',
            'A',
            'Video element missing caption track',
            `Video${video.getAttribute('src') ? ` (src="${truncateAttrValue(video.getAttribute('src')!)}")` : ''} has no <track kind="captions"> element. Users who are deaf or hard of hearing cannot access the audio content.`,
            video,
            'Add a <track kind="captions" src="captions.vtt" srclang="en" label="English"> element inside the video element.',
            `<video controls>
  <source src="video.mp4" type="video/mp4" />
  <track
    kind="captions"
    src="captions.vtt"
    srclang="en"
    label="English"
    default
  />
</video>`,
            '<track kind="captions" src="captions.vtt" srclang="en" label="English" default>'
          )
        )
      }
    })

    audios.forEach((audio) => {
      const tracks = audio.querySelectorAll('track')
      const captionTracks = Array.from(tracks).filter(
        (t) => t.getAttribute('kind') === 'captions' || t.getAttribute('kind') === 'subtitles'
      )

      if (captionTracks.length === 0) {
        issues.push(
          createIssue(
            'media-caption',
            'warning',
            'A',
            'Audio element missing transcript or caption track',
            `Audio element has no <track> element and no visible transcript link. Consider providing a text alternative.`,
            audio,
            'Add a <track kind="captions"> element, or provide a link to a transcript below the audio player.',
            `<audio controls>
  <source src="podcast.mp3" type="audio/mpeg" />
  <track
    kind="captions"
    src="transcript.vtt"
    srclang="en"
    label="English"
  />
</audio>
<a href="/transcript.html">Read transcript</a>`,
          )
        )
      }
    })

    return issues
  },
}

function truncateAttrValue(val: string, max = 50): string {
  return val.length > max ? val.slice(0, max) + '...' : val
}

// ---------- Rule 16: html-title ----------
const htmlTitleRule: Rule = {
  id: 'html-title',
  name: 'Document Title',
  description:
    'The page must have a non-empty <title> element to help users identify the page.',
  wcagLevel: 'A',
  evaluate(doc: Document): Issue[] {
    const issues: Issue[] = []
    const title = doc.querySelector('title')

    if (!title) {
      issues.push(
        createIssue(
          'html-title',
          'error',
          'A',
          'Missing <title> element',
          'The page has no <title> element. Screen readers and browser tabs rely on the title to identify the page.',
          doc.head || doc.documentElement,
          'Add a descriptive <title> element inside the <head> section.',
          '<head>\n  <title>Page Title - Site Name</title>\n</head>',
        ),
      )
    } else if (!title.textContent?.trim()) {
      issues.push(
        createIssue(
          'html-title',
          'error',
          'A',
          'Empty <title> element',
          'The <title> element exists but is empty. Provide a descriptive title for the page.',
          title,
          'Add descriptive text content inside the <title> element.',
          '<title>Home Page - My Website</title>',
        ),
      )
    }

    return issues
  },
}

// ---------- Rule 17: table-scope ----------
const tableScopeRule: Rule = {
  id: 'table-scope',
  name: 'Table Header Scope',
  description:
    'Table header cells (<th>) should have a scope attribute to associate them with data cells for screen readers.',
  wcagLevel: 'A',
  evaluate(doc: Document): Issue[] {
    const issues: Issue[] = []
    const headers = doc.querySelectorAll('th')

    headers.forEach((th) => {
      if (!th.hasAttribute('scope')) {
        issues.push(
          createIssue(
            'table-scope',
            'warning',
            'A',
            'Table header missing scope attribute',
            '<th> element has no scope attribute. Screen readers use scope to associate header cells with the correct data cells.',
            th,
            'Add a scope attribute to the <th> element. Use scope="col" for column headers or scope="row" for row headers.',
            '<!-- Column header -->\n<th scope="col">Name</th>\n\n<!-- Row header -->\n<th scope="row">Total</th>',
            'scope="col"',
          ),
        )
      }
    })

    return issues
  },
}

// ---------- Rule 18: empty-heading ----------
const emptyHeadingRule: Rule = {
  id: 'empty-heading',
  name: 'Empty Heading',
  description:
    'Heading elements must have text content so screen readers can announce them properly.',
  wcagLevel: 'A',
  evaluate(doc: Document): Issue[] {
    const issues: Issue[] = []
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6')

    headings.forEach((heading) => {
      const text = heading.textContent?.trim()
      const hasAriaLabel = heading.hasAttribute('aria-label') && heading.getAttribute('aria-label')?.trim() !== ''

      if (!text && !hasAriaLabel) {
        issues.push(
          createIssue(
            'empty-heading',
            'error',
            'A',
            `Empty <${heading.tagName.toLowerCase()}> heading`,
            `Heading element has no text content and no aria-label. Empty headings confuse screen reader users navigating by headings.`,
            heading,
            'Add descriptive text content inside the heading element, or provide an aria-label.',
            `<h2>Section Title</h2>`,
          ),
        )
      }
    })

    return issues
  },
}

// ---------- Rule 19: accesskey ----------
const accesskeyRule: Rule = {
  id: 'accesskey',
  name: 'Accesskey Attribute',
  description:
    'Accesskey attributes can conflict with screen reader shortcuts and browser shortcuts. Use with caution.',
  wcagLevel: 'A',
  evaluate(doc: Document): Issue[] {
    const issues: Issue[] = []
    const elements = doc.querySelectorAll('[accesskey]')

    elements.forEach((el) => {
      issues.push(
        createIssue(
          'accesskey',
          'warning',
          'A',
          `Element uses accesskey="${el.getAttribute('accesskey')}"`,
          'The accesskey attribute can conflict with screen reader, browser, or operating system shortcuts. This can cause unexpected behavior for assistive technology users.',
          el,
          'Avoid using accesskey. Instead, provide keyboard navigation through proper focus management and semantic HTML.',
          '<!-- Remove accesskey and use proper navigation -->\n<a href="/settings">Settings</a>',
        ),
      )
    })

    return issues
  },
}

// ---------- Rule 20: lang-valid ----------
const langValidRule: Rule = {
  id: 'lang-valid',
  name: 'Valid Language Code',
  description:
    'The lang attribute must contain a valid language code (e.g., "en", "zh-CN").',
  wcagLevel: 'A',
  evaluate(doc: Document): Issue[] {
    const issues: Issue[] = []
    const htmlEl = doc.documentElement
    const lang = htmlEl.getAttribute('lang')

    if (lang && lang.trim()) {
      const trimmed = lang.trim()
      // Basic check: should look like a language code (2-3 letters optionally followed by -XX)
      const validLangPattern = /^[a-zA-Z]{2,3}(-[a-zA-Z]{2,4})?$/
      if (!validLangPattern.test(trimmed)) {
        issues.push(
          createIssue(
            'lang-valid',
            'warning',
            'A',
            `Invalid language code: "${trimmed}"`,
            `The lang attribute value "${trimmed}" does not look like a valid language code. Valid codes follow the format like "en", "zh-CN", "ja", etc.`,
            htmlEl,
            'Use a valid language code. See IETF BCP 47 for the full specification.',
            'lang="en"',
          ),
        )
      }
    }

    return issues
  },
}

// Export all rules
export const rules: Rule[] = [
  imgAltRule,
  colorContrastRule,
  formLabelRule,
  buttonTextRule,
  linkTextRule,
  headingOrderRule,
  htmlLangRule,
  emptyLinkRule,
  tabindexRule,
  iframeTitleRule,
  duplicateIdRule,
  metaViewportRule,
  ariaValidRule,
  listStructureRule,
  mediaCaptionRule,
  htmlTitleRule,
  tableScopeRule,
  emptyHeadingRule,
  accesskeyRule,
  langValidRule,
]

export const ruleMap: Record<string, Rule> = Object.fromEntries(
  rules.map((r) => [r.id, r])
)
