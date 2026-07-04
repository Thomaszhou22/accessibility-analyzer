export type Theme = 'dark' | 'light';

const THEME_KEY = 'accessibility-analyzer-theme';

export function getTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' ? 'light' : 'dark';
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

export function toggleTheme(): Theme {
  const current = getTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

export function applyTheme(theme: Theme): void {
  const html = document.documentElement;
  html.classList.remove('dark', 'light');
  html.classList.add(theme);
}

// Initialize theme on app load
export function initTheme(): void {
  const theme = getTheme();
  applyTheme(theme);
}
