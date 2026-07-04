# AccessScan Chrome Extension

Scan the current webpage for accessibility issues directly from your browser toolbar.

## Features

- One-click scan of the active tab
- Accessibility score with color-coded rating
- Error, warning, and total issue counts
- Top 5 issues displayed inline
- Link to full report on the web version

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select this `extension/` directory
5. The AccessScan icon will appear in your toolbar

## Usage

1. Navigate to any webpage
2. Click the AccessScan icon in the toolbar
3. Click **Scan Current Page**
4. Review the score and top issues
5. Click **View Full Report** for detailed analysis on the web version

## Rules Checked

- Image alt text
- Form control labels
- Button accessible names
- Empty links
- Heading order
- HTML lang attribute
- Iframe titles
- Duplicate IDs
- Document title
- Empty headings

## Architecture

- **manifest.json** - Manifest V3 configuration
- **popup.html/js** - Extension popup UI and scan logic
- **content.js** - Injected into pages to extract HTML
- **background.js** - Service worker for message coordination
- **rules.js** - Simplified accessibility rules (standalone, no dependencies)
- **icons/** - Extension icons (16/48/128px)

## Development

This extension is part of the [accessibility-analyzer](https://github.com/zhouhanchen/accessibility-analyzer) project. The web version is deployed at [Vercel](https://accessibility-analyzer.vercel.app/).

The extension code is fully standalone and does not depend on the project's `node_modules`.
