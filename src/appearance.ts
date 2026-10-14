import type { Settings } from './storage'
import { setSystemBarIcons } from './native/systemBars'
import { applyTrial } from './trial'

/**
 * The one place appearance is applied: mode and accent on <html>, where
 * index.css picks them up, plus the browser theme-color and the system bar
 * icons. index.html sets the attributes before first paint; this keeps
 * everything in step after settings load and whenever they change.
 */
export function applyAppearance({
  theme,
  accent,
  trialMark,
  trialRow,
}: Pick<Settings, 'theme' | 'accent' | 'trialMark' | 'trialRow'>): void {
  const root = document.documentElement
  root.dataset.theme = theme
  root.dataset.accent = accent
  // TEMPORARY: mark/row trial.
  applyTrial(theme, trialMark, trialRow)
  // The browser chrome / status bar follows the ground token, not a literal.
  const ground = getComputedStyle(root).getPropertyValue('--ground').trim()
  if (ground) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', ground)
  setSystemBarIcons(theme)
}
