import { parseWhole } from './draft'
import { MinusIcon, PlusIcon } from './icons'

interface NumberStepperProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  step: number
  min: number
  max: number
  unit?: string
  disabled?: boolean
  invalid?: boolean
  /** Shown in place of the number when it is 0, e.g. "Off". */
  zeroLabel?: string
}

export function NumberStepper({
  id,
  label,
  value,
  onChange,
  step,
  min,
  max,
  unit,
  disabled = false,
  invalid = false,
  zeroLabel,
}: NumberStepperProps) {
  const current = parseWhole(value)

  // From an unparseable field, the steppers recover to the nearest sensible value.
  const nudge = (direction: 1 | -1) => {
    const base = Number.isNaN(current) ? min : current
    // Snap to the step grid so 47 + 5 lands on 50, not 52.
    const snapped = direction > 0
      ? Math.floor(base / step) * step + step
      : Math.ceil(base / step) * step - step
    onChange(String(Math.min(max, Math.max(min, snapped))))
  }

  const showZeroLabel = zeroLabel !== undefined && current === 0

  return (
    <div className={`stepper${disabled ? ' stepper--disabled' : ''}`}>
      <label className="stepper__label" htmlFor={id}>
        {label}
      </label>
      <div className="stepper__row">
        <button
          type="button"
          className="btn stepper__btn"
          aria-label={`Decrease ${label}`}
          onClick={() => nudge(-1)}
          disabled={disabled || (!Number.isNaN(current) && current <= min)}
        >
          <MinusIcon />
        </button>
        <div className={`stepper__value${invalid ? ' is-invalid' : ''}`}>
          <input
            id={id}
            className="stepper__input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={showZeroLabel ? zeroLabel : value}
            onFocus={(event) => {
              if (showZeroLabel) onChange('0')
              event.currentTarget.select()
            }}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            aria-invalid={invalid}
          />
          {unit && !showZeroLabel && <span className="stepper__unit">{unit}</span>}
        </div>
        <button
          type="button"
          className="btn stepper__btn"
          aria-label={`Increase ${label}`}
          onClick={() => nudge(1)}
          disabled={disabled || (!Number.isNaN(current) && current >= max)}
        >
          <PlusIcon />
        </button>
      </div>
    </div>
  )
}
