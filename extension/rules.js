// Simplified accessibility rules for Chrome extension
// Standalone JavaScript, no dependencies

let issueCounter = 0;

function makeId() {
  issueCounter++;
  return `issue-${Date.now()}-${issueCounter}`;
}

function truncateHtml(html, maxLen = 200) {
  const trimmed = html.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen) + '...';
}

function getElementHtml(el) {
  return truncateHtml(el.outerHTML);
}

function buildSelector(el) {
  const parts = [];
  let current = el;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector += `#${current.id}`;
      parts.unshift(selector);
      break;
    }

    const classes = Array.from(current.classList);
    if (classes.length > 0) {
      selector += `.${classes.join('.')}`;
    }

    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (c) => c.tagName === current.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    parts.unshift(selector);
    current = current.parentElement;
  }

  return parts.join(' > ');
}

function createIssue(ruleId, level, title, description, element, recommendation) {
  return {
    id: makeId(),
    ruleId,
    level,
    title,
    description,
    elementSelector: buildSelector(element),
    elementHtml: getElementHtml(element),
    recommendation
  };
}

// Rule 1: Image alt text
function checkImgAlt(doc) {
  const issues = [];
  const images = doc.querySelectorAll('img');

  images.forEach((img) => {
    if (!img.hasAttribute('alt')) {
      issues.push(
        createIssue(
          'img-alt',
          'error',
          'Image missing alt attribute',
          `Image src="${img.getAttribute('src') || ''}" has no alt attribute.`,
          img,
          'Add an alt attribute that describes the image content. For decorative images, use alt="".'
        )
      );
    }
  });

  return issues;
}

// Rule 2: Form labels
function checkFormLabels(doc) {
  const issues = [];
  const controls = doc.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), select, textarea'
  );

  controls.forEach((control) => {
    const id = control.id;
    const hasLabelById = id && doc.querySelector(`label[for="${CSS.escape(id)}"]`);
    const hasWrappingLabel = control.closest('label');
    const hasAriaLabel = control.hasAttribute('aria-label');
    const hasAriaLabelledby = control.hasAttribute('aria-labelledby');
    const hasTitle = control.hasAttribute('title') && control.getAttribute('title').trim() !== '';

    if (!hasLabelById && !hasWrappingLabel && !hasAriaLabel && !hasAriaLabelledby && !hasTitle) {
      issues.push(
        createIssue(
          'form-label',
          'error',
          'Form control missing label',
          `${control.tagName.toLowerCase()} has no associated label, aria-label, or title attribute.`,
          control,
          'Add a <label> element with a matching for attribute, or wrap the control in a <label>, or add an aria-label attribute.'
        )
      );
    }
  });

  return issues;
}

// Rule 3: Button text
function checkButtonText(doc) {
  const issues = [];
  const buttons = doc.querySelectorAll('button, [role="button"]');

  buttons.forEach((button) => {
    const textContent = button.textContent.trim();
    const hasAriaLabel = button.hasAttribute('aria-label') && button.getAttribute('aria-label').trim() !== '';
    const hasAriaLabelledby = button.hasAttribute('aria-labelledby');
    const hasTitle = button.hasAttribute('title') && button.getAttribute('title').trim() !== '';
    const hasImgAlt = button.querySelector('img[alt]:not([alt=""])');

    if (!textContent && !hasAriaLabel && !hasAriaLabelledby && !hasTitle && !hasImgAlt) {
      issues.push(
        createIssue(
          'button-text',
          'error',
          'Button has no accessible name',
          'Button element has no text content, aria-label, title, or image with alt text.',
          button,
          'Add descriptive text inside the button, or add an aria-label attribute.'
        )
      );
    }
  });

  return issues;
}

// Rule 4: Empty links
function checkEmptyLinks(doc) {
  const issues = [];
  const links = doc.querySelectorAll('a[href]');

  links.forEach((link) => {
    const text = link.textContent.trim();
    const hasAriaLabel = link.hasAttribute('aria-label') && link.getAttribute('aria-label').trim() !== '';
    const hasAriaLabelledby = link.hasAttribute('aria-labelledby');
    const hasTitle = link.hasAttribute('title') && link.getAttribute('title').trim() !== '';
    const hasImgAlt = link.querySelector('img[alt]:not([alt=""])');

    if (!text && !hasAriaLabel && !hasAriaLabelledby && !hasTitle && !hasImgAlt) {
      issues.push(
        createIssue(
          'empty-link',
          'error',
          'Empty link with no accessible name',
          'Link has no text content, image with alt text, aria-label, or title.',
          link,
          'Add text content inside the link, or provide an aria-label.'
        )
      );
    }
  });

  return issues;
}

// Rule 5: Heading order
function checkHeadingOrder(doc) {
  const issues = [];
  const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let previousLevel = 0;

  headings.forEach((heading) => {
    const currentLevel = parseInt(heading.tagName[1]);

    if (previousLevel > 0 && currentLevel > previousLevel + 1) {
      issues.push(
        createIssue(
          'heading-order',
          'warning',
          `Heading level skipped from h${previousLevel} to h${currentLevel}`,
          `Heading levels should not skip. An h${previousLevel} is followed by h${currentLevel}.`,
          heading,
          `Use h${previousLevel + 1} instead of h${currentLevel}.`
        )
      );
    }

    previousLevel = currentLevel;
  });

  return issues;
}

// Rule 6: HTML lang attribute
function checkHtmlLang(doc) {
  const issues = [];
  const htmlEl = doc.documentElement;

  if (!htmlEl.hasAttribute('lang')) {
    issues.push(
      createIssue(
        'html-lang',
        'error',
        'Missing lang attribute on <html> element',
        'The html element does not have a lang attribute.',
        htmlEl,
        'Add a lang attribute to the html element (e.g., lang="en" or lang="zh-CN").'
      )
    );
  } else if (htmlEl.getAttribute('lang').trim() === '') {
    issues.push(
      createIssue(
        'html-lang',
        'error',
        'Empty lang attribute on <html> element',
        'The html element has a lang attribute but its value is empty.',
        htmlEl,
        'Provide a valid language code (e.g., lang="en" or lang="zh-CN").'
      )
    );
  }

  return issues;
}

// Rule 7: Iframe title
function checkIframeTitle(doc) {
  const issues = [];
  const iframes = doc.querySelectorAll('iframe');

  iframes.forEach((iframe) => {
    const title = iframe.getAttribute('title');
    const hasAriaLabel = iframe.hasAttribute('aria-label') && iframe.getAttribute('aria-label').trim() !== '';

    if (!title || !title.trim()) {
      if (!hasAriaLabel) {
        issues.push(
          createIssue(
            'iframe-title',
            'error',
            'Iframe missing title attribute',
            `Iframe has no title attribute.`,
            iframe,
            'Add a descriptive title attribute to the iframe.'
          )
        );
      }
    }
  });

  return issues;
}

// Rule 8: Duplicate IDs
function checkDuplicateIds(doc) {
  const issues = [];
  const allElements = doc.querySelectorAll('[id]');
  const idMap = new Map();

  allElements.forEach((el) => {
    const id = el.getAttribute('id') || '';
    if (!id) return;

    if (!idMap.has(id)) {
      idMap.set(id, []);
    }
    idMap.get(id).push(el);
  });

  idMap.forEach((elements, id) => {
    if (elements.length > 1) {
      elements.forEach((el) => {
        issues.push(
          createIssue(
            'duplicate-id',
            'error',
            `Duplicate ID: "${id}" (${elements.length} occurrences)`,
            `The ID "${id}" appears ${elements.length} times on the page.`,
            el,
            `Make each ID unique.`
          )
        );
      });
    }
  });

  return issues;
}

// Rule 9: Document title
function checkDocumentTitle(doc) {
  const issues = [];
  const title = doc.querySelector('title');

  if (!title) {
    issues.push(
      createIssue(
        'html-title',
        'error',
        'Missing <title> element',
        'The page has no <title> element.',
        doc.head || doc.documentElement,
        'Add a descriptive <title> element inside the <head> section.'
      )
    );
  } else if (!title.textContent.trim()) {
    issues.push(
      createIssue(
        'html-title',
        'error',
        'Empty <title> element',
        'The <title> element exists but is empty.',
        title,
        'Add descriptive text content inside the <title> element.'
      )
    );
  }

  return issues;
}

// Rule 10: Empty headings
function checkEmptyHeadings(doc) {
  const issues = [];
  const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');

  headings.forEach((heading) => {
    const text = heading.textContent.trim();
    const hasAriaLabel = heading.hasAttribute('aria-label') && heading.getAttribute('aria-label').trim() !== '';

    if (!text && !hasAriaLabel) {
      issues.push(
        createIssue(
          'empty-heading',
          'error',
          `Empty <${heading.tagName.toLowerCase()}> heading`,
          'Heading element has no text content and no aria-label.',
          heading,
          'Add descriptive text content inside the heading element.'
        )
      );
    }
  });

  return issues;
}

// Main scan function
function scanDocument(doc) {
  const allIssues = [];

  // Run all rules
  allIssues.push(...checkImgAlt(doc));
  allIssues.push(...checkFormLabels(doc));
  allIssues.push(...checkButtonText(doc));
  allIssues.push(...checkEmptyLinks(doc));
  allIssues.push(...checkHeadingOrder(doc));
  allIssues.push(...checkHtmlLang(doc));
  allIssues.push(...checkIframeTitle(doc));
  allIssues.push(...checkDuplicateIds(doc));
  allIssues.push(...checkDocumentTitle(doc));
  allIssues.push(...checkEmptyHeadings(doc));

  // Count by level
  let errors = 0;
  let warnings = 0;
  let infos = 0;

  allIssues.forEach((issue) => {
    switch (issue.level) {
      case 'error':
        errors++;
        break;
      case 'warning':
        warnings++;
        break;
      case 'info':
        infos++;
        break;
    }
  });

  // Calculate score
  const errorDeduction = Math.min(errors * 10, 80);
  const warningDeduction = Math.min(warnings * 4, 30);
  const infoDeduction = Math.min(infos * 1, 10);
  const score = Math.max(0, Math.min(100, 100 - errorDeduction - warningDeduction - infoDeduction));

  return {
    score,
    totalIssues: allIssues.length,
    errors,
    warnings,
    infos,
    issues: allIssues
  };
}
