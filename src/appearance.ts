import type { Settings } from './storage'

/**
 * Puts the chosen mode and accent on <html>, where index.css picks them up.
 * index.html does the same before first paint; this keeps it in step after
 * settings load and whenever they change.
 */
export function applyAppearance({ theme, accent }: Pick<Settings, 'theme' | 'accent'>): void {
  const root = document.documentElement
  root.dataset.theme = theme
  root.dataset.accent = accent
  // The browser chrome / status bar follows the ground token, not a literal.
  const ground = getComputedStyle(root).getPropertyValue('--ground').trim()
  if (ground) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', ground)
}
