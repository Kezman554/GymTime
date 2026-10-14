/**
 * The stopwatch glyph as a decorative brand mark behind Home's list, drawn in
 * the user's chosen accent (currentColor = var(--accent), set in CSS).
 *
 * TWO COPIES: this drawing is copied from the element with id="glyph" in
 * assets/stopwatch.svg, the source of the launcher icon and splash. A change
 * to the drawing has to be made in both. The icon file can't be used here:
 * its colours are baked in at build time and this has to follow the accent.
 */
export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`brand-mark ${className}`}
      // The glyph's own bounds within the icon's 1024 square, so it sizes by itself.
      viewBox="170 118 684 808"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* crown and stem */}
        <rect x="452" y="128" width="120" height="64" rx="24" fill="currentColor" stroke="none" />
        <rect x="490" y="180" width="44" height="80" fill="currentColor" stroke="none" />
        {/* side button at 1 o'clock */}
        <rect
          x="742"
          y="226"
          width="96"
          height="52"
          rx="20"
          fill="currentColor"
          stroke="none"
          transform="rotate(45 790 252)"
        />
        {/* case */}
        <circle cx="512" cy="584" r="300" strokeWidth="64" />
        {/* elapsed sweep, 12 to 4 o'clock */}
        <path d="M512 584 L512 344 A240 240 0 0 1 719.8 704 Z" fill="currentColor" fillOpacity="0.28" stroke="none" />
        {/* hand at 4 o'clock and hub */}
        <line x1="512" y1="584" x2="704" y2="695" strokeWidth="44" />
        <circle cx="512" cy="584" r="40" fill="currentColor" stroke="none" />
      </g>
    </svg>
  )
}
