/**
 * The instrument dial: bezel, guide ring, index marks, a progress arc on its
 * track, and a needle with a counterweight. Progress runs clockwise from 12.
 * Drawn on a 300×300 viewBox; colours come from the design tokens via CSS.
 */

const C = 150
const ARC_R = 133
/** 2π × 133, rounded: the dash length of a full arc. */
const CIRCUMFERENCE = 836

const MARKS = Array.from({ length: 12 }, (_, i) => i * 30)

interface DialProps {
  /** 0 to 1. */
  progress: number
  /** Accent arc (work). Otherwise the arc is muted. */
  active?: boolean
  /** A full, unbroken arc in ink with the needle at twelve. */
  complete?: boolean
  /** Fill the inner circle with a wedge that grows behind the needle (work). */
  wedge?: boolean
  size?: number
}

const WEDGE_R = 120

/** The sector from twelve o'clock, clockwise, covering fraction p of the inner circle. */
function wedgePath(p: number): string {
  const a = p * 2 * Math.PI
  const x = C + WEDGE_R * Math.sin(a)
  const y = C - WEDGE_R * Math.cos(a)
  const large = p > 0.5 ? 1 : 0
  return `M${C} ${C} L${C} ${C - WEDGE_R} A${WEDGE_R} ${WEDGE_R} 0 ${large} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z`
}

export function Dial({ progress, active = false, complete = false, wedge = false, size = 270 }: DialProps) {
  const p = complete ? 1 : Math.min(1, Math.max(0, progress))
  const needleDeg = complete ? 0 : p * 360
  const arcClass = complete ? 'dial__arc dial__arc--complete' : active ? 'dial__arc dial__arc--active' : 'dial__arc'

  return (
    <svg className="dial" viewBox="0 0 300 300" width={size} height={size} aria-hidden="true">
      <circle className="dial__bezel" cx={C} cy={C} r={146} vectorEffect="non-scaling-stroke" />
      <circle className="dial__guide" cx={C} cy={C} r={120} vectorEffect="non-scaling-stroke" />
      {wedge &&
        p > 0 &&
        // A full turn can't be drawn as one arc, so the last sliver becomes a circle.
        (p >= 0.999 ? (
          <circle className={`dial__wedge${active ? '' : ' dial__wedge--paused'}`} cx={C} cy={C} r={WEDGE_R} />
        ) : (
          <path className={`dial__wedge${active ? '' : ' dial__wedge--paused'}`} d={wedgePath(p)} />
        ))}
      {MARKS.map((deg) => (
        <line
          key={deg}
          className="dial__mark"
          x1={C}
          y1={C - 143}
          x2={C}
          y2={C - 128}
          strokeWidth={deg % 90 === 0 ? 3 : 1.5}
          transform={`rotate(${deg} ${C} ${C})`}
        />
      ))}
      <circle className="dial__track" cx={C} cy={C} r={ARC_R} />
      <circle
        className={arcClass}
        cx={C}
        cy={C}
        r={ARC_R}
        strokeDasharray={`${p * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
        transform={`rotate(-90 ${C} ${C})`}
      />
      <line
        className="dial__needle"
        x1={C}
        y1={C + 28}
        x2={C}
        y2={C - 120}
        transform={`rotate(${needleDeg} ${C} ${C})`}
      />
      <circle className="dial__pin" cx={C} cy={C} r={7} />
    </svg>
  )
}
