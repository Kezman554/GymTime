/**
 * TEMPORARY: mark-weight x row-translucency trial (Settings > temporary
 * section). The single source for the step values: applyAppearance writes
 * the chosen ones onto <html> as --mark-opacity and --row-alpha, and the
 * panel computes its contrast table from the same numbers and the live
 * tokens. Remove this file once a pair is baked into index.css.
 */
import type { Theme } from './storage'

/** Mark opacity steps per ground: today's value up to roughly three times it. */
export const MARK_STEPS: Record<Theme, readonly number[]> = {
  light: [0.12, 0.2, 0.28, 0.36],
  dark: [0.1, 0.17, 0.24, 0.3],
}

/** Unselected row background alpha. 94% showed nothing measurable, so 90/80. */
export const ROW_STEPS: readonly number[] = [1, 0.9, 0.8]

export function applyTrial(theme: Theme, markStep: number, rowStep: number): void {
  const root = document.documentElement
  root.style.setProperty('--mark-opacity', String(MARK_STEPS[theme][markStep] ?? MARK_STEPS[theme][0]))
  root.style.setProperty('--row-alpha', String(ROW_STEPS[rowStep] ?? 1))
}

type Rgb = [number, number, number]

function parse(hex: string): Rgb {
  const h = hex.trim().replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb
}

/** a over b at alpha, in gamma-encoded sRGB, which is how the browser composites. */
function over(a: Rgb, b: Rgb, alpha: number): Rgb {
  return a.map((v, i) => v * alpha + b[i] * (1 - alpha)) as Rgb
}

function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const v = c / 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrast(a: Rgb, b: Rgb): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

const ACCENT_KEYS = ['red', 'orange', 'sky', 'green', 'brass', 'mono'] as const

/**
 * Worst-case contrast of the spec line (muted) for each mark x row step, on
 * the current theme: muted text over a translucent row where the mark's solid
 * stroke is behind it, taking the worst of all six accents.
 */
export function specLineTable(theme: Theme): number[][] {
  const css = getComputedStyle(document.documentElement)
  const ground = parse(css.getPropertyValue('--ground'))
  const muted = parse(css.getPropertyValue('--muted'))
  const accents = ACCENT_KEYS.map((k) => parse(css.getPropertyValue(`--accent-${k}`)))
  return MARK_STEPS[theme].map((mark) =>
    ROW_STEPS.map((row) =>
      Math.min(...accents.map((accent) => contrast(muted, over(ground, over(accent, ground, mark), row)))),
    ),
  )
}
