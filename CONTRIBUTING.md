# Contributing to AccessScan

Thanks for your interest in improving web accessibility! This guide covers the basics.

## Getting Started

```bash
git clone https://github.com/Thomaszhou22/accessibility-analyzer.git
cd accessibility-analyzer
npm install
npm run dev
```

Open `http://localhost:5000` and start scanning.

## Adding a New WCAG Rule

Each rule lives in `src/engine/rules.ts` as a `Rule` object:

```typescript
{
  id: 'your-rule-id',
  name: 'Human-readable name',
  description: 'What this rule checks',
  wcagLevel: 'A', // A, AA, or AAA
  evaluate: (doc: Document): Issue[] => {
    const issues: Issue[] = []
    // Query the DOM and return issues
    return issues
  }
}
```

### Guidelines

- One rule per `Rule` object, independent of others
- Return an empty array if no issues found — never throw
- Include a clear `recommendation` and `fixCode` in each `Issue`
- Reference the specific WCAG criteria (e.g., `1.4.3 Contrast (Minimum)`)
- Test against real websites, not just synthetic HTML

## Reporting Bugs

Open an [issue](https://github.com/Thomaszhou22/accessibility-analyzer/issues) with:

1. The URL or HTML you scanned
2. What you expected
3. What actually happened
4. Browser and OS

## Pull Requests

1. Fork the repo and create a branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run `npm run build` to verify it compiles
4. Open a PR with a clear description of what changed and why

## Code Style

- TypeScript strict mode
- Tailwind CSS for styling — no custom CSS files
- Functional components with hooks
- No external UI libraries (keep dependencies minimal)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
