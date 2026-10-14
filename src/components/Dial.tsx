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
  size?: number
}

export function Dial({ progress, active = false, complete = false, size = 270 }: DialProps) {
  const p = complete ? 1 : Math.min(1, Math.max(0, progress))
  const needleDeg = complete ? 0 : p * 360
  const arcClass = complete ? 'dial__arc dial__arc--complete' : active ? 'dial__arc dial__arc--active' : 'dial__arc'

  return (
    <svg className="dial" viewBox="0 0 300 300" width={size} height={size} aria-hidden="true">
      <circle className="dial__bezel" cx={C} cy={C} r={146} vectorEffect="non-scaling-stroke" />
      <circle className="dial__guide" cx={C} cy={C} r={120} vectorEffect="non-scaling-stroke" />
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
