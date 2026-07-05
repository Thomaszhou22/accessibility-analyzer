# AccessScan — Web Accessibility Scanner

## Overview

AccessScan is a web accessibility scanner that helps developers find and fix WCAG 2.1 accessibility issues on any website. With over 1.6 billion people worldwide living with a disability and 96% of websites failing accessibility standards, AccessScan makes it effortless to identify problems before they exclude users.

No installation, no dependencies, no signup. Open the URL, type any website, and get an instant accessibility report.

**Live Demo:** https://accessibility-analyzer-phi.vercel.app

**GitHub:** https://github.com/Thomaszhou22/accessibility-analyzer

---

## The Problem

Web accessibility means building websites that everyone can use, including people with visual, motor, cognitive, or hearing disabilities. The WCAG 2.1 standard defines what makes a site accessible, but most developers never check compliance because existing tools are expensive, complex, or require technical expertise.

Developers need a fast, free, and visual way to understand exactly where their sites fail and how to fix them.

---

## The Solution

AccessScan addresses this by providing instant, visual accessibility analysis with zero setup:

### Single Page Scan
Enter any URL and get an immediate accessibility score (0-100) with a detailed breakdown of every issue found. 20 WCAG 2.1 rules cover images, forms, contrast, semantics, ARIA, headings, and more.

### Live Preview with Click-to-Highlight
The most powerful feature: click any issue in the report, and the exact problematic element gets highlighted in a live preview of the webpage. A dark overlay dims the rest of the page while a red box marks the issue with a descriptive label. Developers see exactly which element needs fixing, not just a line number.

### Batch Scan
Scan an entire website at once (up to 20 pages). The scanner discovers pages automatically through sitemap.xml, robots.txt, and homepage link extraction. Results are sorted by score, worst first, so developers know exactly where to start.

### HTML Paste Mode
For JavaScript-rendered pages or bot-protected sites, paste the rendered HTML directly for analysis.

### Persistent Tracking
- **Recent Scans** — every scan saved locally for one-click re-scan
- **Favorites** — star important scans for quick access
- **Scan Activity Heatmap** — GitHub-style contribution graph showing scanning activity over 90 days
- **Score History** — per-URL score trend tracking, shown only when scores actually change

### PDF Export
One-click printable accessibility report with issue details, WCAG criteria references, and concrete fix recommendations.

---

## How It Works

**Fetching:** 7-layer strategy tries a direct request first, then automatically falls back through multiple CORS proxies (self proxy, corsproxy.io, allorigins, jina.ai, codetabs, thingproxy). This ensures reliable scanning even for sites with strict CORS policies.

**Rule Engine:** Each of the 20 WCAG rules is an independent function that takes a parsed DOM document and returns issues with severity levels, WCAG criteria references, element selectors, and fix recommendations. Rules run independently, errors in one rule never block others.

**Scoring:** Pages are scored 0-100 based on the number and severity of issues found, with A/AA/AAA grading.

**Batch Discovery:** For multi-page scans, the system reads robots.txt for Sitemap directives, tries common sitemap paths, and falls back to extracting internal links from the homepage HTML.

---

## Tech Stack

- **React 18 + TypeScript** (strict mode) — type-safe component architecture
- **Tailwind CSS** — consistent design system with dark/light themes
- **Vite 5** — fast development and optimized production builds
- **Vercel Serverless Functions** — API proxy for CORS bypass
- **localStorage** — all data persistence, no backend database required

**Zero external accessibility libraries.** The entire rule engine, scoring system, and 20 WCAG detection rules are built from scratch.

---

## Accessibility of AccessScan Itself

AccessScan follows its own advice. The interface uses semantic HTML, sufficient color contrast, keyboard-navigable components, ARIA labels where needed, and respects user theme preferences (dark/light mode toggle).

---

## Target Users

- **Web developers** checking their sites before launch
- **Designers** verifying accessibility compliance
- **Students** learning about WCAG standards
- **Organizations** auditing their web presence for ADA compliance
- **Anyone** who cares about making the web more inclusive

---

## Future Plans

- Additional WCAG 2.2 rules (50+ total)
- Automated fix suggestions with one-click code corrections
- Browser extension for real-time scanning
- CI/CD integration for continuous accessibility monitoring
- Multi-language support for global accessibility standards
