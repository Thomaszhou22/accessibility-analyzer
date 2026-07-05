# Changelog

## v1.0.0 (2026-07-05)

### Core Features

- **Single Page Scan** — Enter any URL, get instant WCAG 2.1 accessibility score with 20 detection rules
- **Live Preview Highlighting** — Click any issue to highlight the exact element in a live page preview
- **Batch Scan** — Scan up to 20 pages from a website's sitemap, with multi-proxy fetching and homepage link extraction fallback
- **HTML Paste Mode** — Scan raw HTML for JavaScript-rendered pages or bot-protected sites
- **PDF Export** — One-click printable accessibility report with issue details and fix recommendations

### Data & Persistence

- **Recent Scans** — Every scan saved to localStorage with one-click re-scan
- **Favorites** — Star important scans for quick access, independent from scan history
- **Scan Activity Heatmap** — GitHub-style 90-day contribution graph
- **Score History** — Per-URL score trend tracking, shown only when scores actually change
- **Independent Storage** — Clearing Recent Scans does not affect Activity, Favorites, or Score History

### Scanning Engine

- **7-Layer Fetch Strategy** — Direct request, self proxy, corsproxy.io, allorigins, jina.ai, codetabs, thingproxy
- **20 WCAG Rules** — Covering Perceivable, Operable, Understandable, and Robust principles
- **Scoring System** — 0-100 score with A/AA/AAA grading

### Tech Stack

- React 18 + TypeScript (strict mode)
- Tailwind CSS
- Vite 5
- Vercel Serverless Functions (API proxy)
- Zero external a11y libraries — engine is fully custom-built
