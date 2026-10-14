import type { Workout } from '../storage'
import { formatDuration, workoutDurationSeconds } from '../engine/duration'
import { CogIcon, PencilIcon, PlusIcon } from './icons'

interface HomeScreenProps {
  workouts: Workout[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onEdit: (workout: Workout) => void
  onStart: (workout: Workout) => void
  onOpenSettings: () => void
}

/** 2π × 16, rounded: the dash length of a full glyph arc. */
const GLYPH_CIRCUMFERENCE = 101

/** A small dial: the arc is the share of each work + rest round spent working. */
function RatioGlyph({ workout }: { workout: Workout }) {
  const work = workout.workSeconds / (workout.workSeconds + workout.restSeconds)
  return (
    <svg className="ratio-glyph" viewBox="0 0 42 42" width="42" height="42" aria-hidden="true">
      <circle className="ratio-glyph__track" cx="21" cy="21" r="16" />
      <circle
        className="ratio-glyph__arc"
        cx="21"
        cy="21"
        r="16"
        strokeDasharray={`${work * GLYPH_CIRCUMFERENCE} ${GLYPH_CIRCUMFERENCE}`}
        transform="rotate(-90 21 21)"
      />
    </svg>
  )
}

function summary(workout: Workout): string {
  const loops = workout.loopEnabled ? workout.loops : 1
  const total = formatDuration(
    workoutDurationSeconds({ ...workout, exerciseCount: workout.exercises.length }),
  )
  return `${workout.exercises.length} × ${workout.workSeconds}s/${workout.restSeconds}s × ${loops} · ${total}`
}

export function HomeScreen({
  workouts,
  selectedId,
  onSelect,
  onNew,
  onEdit,
  onStart,
  onOpenSettings,
}: HomeScreenProps) {
  const selected = workouts.find((workout) => workout.id === selectedId) ?? null

  return (
    <main className="screen home">
      <header className="screen__header home__header">
        <h1 className="screen__title">GymTime</h1>
        <div className="home__actions">
          <button type="button" className="round-btn" aria-label="New workout" onClick={onNew}>
            <PlusIcon />
          </button>
          <button type="button" className="round-btn" aria-label="Settings" onClick={onOpenSettings}>
            <CogIcon />
          </button>
        </div>
      </header>
      <div className="chapter-ring" aria-hidden="true" />

      {workouts.length === 0 ? (
        <p className="empty">No workouts yet. Tap + to make one.</p>
      ) : (
        <ul className="workout-list" aria-label="Saved workouts">
          {workouts.map((workout) => {
            const isSelected = workout.id === selectedId
            return (
              <li key={workout.id} className={`workout-item${isSelected ? ' is-selected' : ''}`}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  className="workout-row"
                  onClick={() => onSelect(workout.id)}
                >
                  <RatioGlyph workout={workout} />
                  <span className="workout-row__text">
                    <span className="workout-row__name">{workout.name}</span>
                    <span className="workout-row__spec">{summary(workout)}</span>
                  </span>
                </button>
                {/* Every row keeps this slot, so nothing reflows when the selection moves. */}
                <span className="workout-item__edit-slot">
                  {isSelected && (
                    <button
                      type="button"
                      className="workout-item__edit"
                      aria-label={`Edit ${workout.name}`}
                      onClick={() => onEdit(workout)}
                    >
                      <PencilIcon />
                    </button>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      <div className="home__footer">
        <button
          type="button"
          className="btn btn--start"
          disabled={!selected}
          onClick={() => selected && onStart(selected)}
        >
          Start
        </button>
      </div>
    </main>
  )
}
