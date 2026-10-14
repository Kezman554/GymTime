import { useState } from 'react'
import type { Workout } from '../storage'
import { formatDuration, workoutDurationSeconds } from '../engine/duration'

interface HomeScreenProps {
  workouts: Workout[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onEdit: (workout: Workout) => void
  onDelete: (workout: Workout) => void
  onStart: (workout: Workout) => void
  onOpenSettings: () => void
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
  onDelete,
  onStart,
  onOpenSettings,
}: HomeScreenProps) {
  const selected = workouts.find((workout) => workout.id === selectedId) ?? null
  // Delete takes two taps: the first arms it for the selected workout, the second deletes.
  const [armedDeleteId, setArmedDeleteId] = useState<string | null>(null)
  const deleteArmed = selected !== null && armedDeleteId === selected.id

  return (
    <main className="screen home">
      <header className="screen__header home__header">
        <h1 className="screen__title">GymTime</h1>
        <button type="button" className="btn btn--icon" aria-label="Settings" onClick={onOpenSettings}>
          <svg
            className="icon"
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="square"
            aria-hidden="true"
          >
            <path d="M3 6h18M3 12h18M3 18h18" />
            <path d="M8 3.5v5M16 9.5v5M10 15.5v5" fill="none" />
          </svg>
        </button>
      </header>

      {workouts.length === 0 ? (
        <p className="empty">No workouts yet. Tap New to make one.</p>
      ) : (
        <ul className="workout-list" role="listbox" aria-label="Saved workouts">
          {workouts.map((workout) => (
            <li key={workout.id}>
              <button
                type="button"
                role="option"
                aria-selected={workout.id === selectedId}
                className={`workout-card${workout.id === selectedId ? ' is-selected' : ''}`}
                onClick={() => onSelect(workout.id)}
              >
                <span className="workout-card__name">{workout.name}</span>
                <span className="workout-card__summary">{summary(workout)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="home__footer">
        <div className="button-row button-row--three">
          <button type="button" className="btn btn--large" onClick={onNew}>
            New
          </button>
          <button
            type="button"
            className="btn btn--large"
            disabled={!selected}
            onClick={() => selected && onEdit(selected)}
          >
            Edit
          </button>
          <button
            type="button"
            className={`btn btn--large btn--danger${deleteArmed ? ' is-armed' : ''}`}
            disabled={!selected}
            onClick={() => {
              if (!selected) return
              if (deleteArmed) {
                setArmedDeleteId(null)
                onDelete(selected)
              } else {
                setArmedDeleteId(selected.id)
              }
            }}
          >
            {deleteArmed ? 'Sure?' : 'Delete'}
          </button>
        </div>
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
