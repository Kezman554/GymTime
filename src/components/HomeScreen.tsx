import { useEffect, useRef, useState } from 'react'
import type { Workout } from '../storage'
import { formatDuration, workoutDurationSeconds } from '../engine/duration'
import { ConfirmDialog } from './ConfirmDialog'

interface HomeScreenProps {
  workouts: Workout[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onEdit: (workout: Workout) => void
  onDelete: (workout: Workout) => void
  onStart: (workout: Workout) => void
  onOpenSettings: () => void
  /** App calls this when Android/browser back is pressed; return true to stay put. */
  setBackInterceptor: (intercept: (() => boolean) | null) => void
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
  setBackInterceptor,
}: HomeScreenProps) {
  const selected = workouts.find((workout) => workout.id === selectedId) ?? null
  // Delete asks first. The dialog keeps the workout it was opened for.
  const [pendingDelete, setPendingDelete] = useState<{ workout: Workout; rowBottom: number } | null>(null)
  const deleteRef = useRef<HTMLButtonElement>(null)
  const confirming = pendingDelete !== null

  // Home has no history entry of its own, so opening the dialog pushes one for
  // Back to consume. Back then reaches the interceptor, which closes the
  // dialog; returning false lets App carry on to Home, where we already are.
  useEffect(() => {
    if (!confirming) return
    setBackInterceptor(() => {
      setPendingDelete(null)
      return false
    })
    return () => setBackInterceptor(null)
  }, [confirming, setBackInterceptor])

  const openDelete = (workout: Workout) => {
    if (confirming) return
    const rect = deleteRef.current?.getBoundingClientRect()
    window.history.pushState({ screen: 'confirm-delete' }, '')
    setPendingDelete({ workout, rowBottom: rect ? window.innerHeight - rect.bottom : 0 })
  }

  // Cancel, scrim and confirm close it from inside, so the entry pushed on open comes off too.
  const closeDelete = () => {
    setPendingDelete(null)
    window.history.back()
  }

  return (
    <main className="screen home">
      <header className="screen__header home__header" inert={confirming}>
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
        <ul className="workout-list" role="listbox" aria-label="Saved workouts" inert={confirming}>
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

      <div className="home__footer" inert={confirming}>
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
            ref={deleteRef}
            type="button"
            className="btn btn--large btn--danger"
            disabled={!selected}
            onClick={() => selected && openDelete(selected)}
          >
            Delete
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

      {pendingDelete && (
        <ConfirmDialog
          question={`Delete ${pendingDelete.workout.name}?`}
          detail="This can't be undone."
          confirmLabel="Delete"
          rowBottom={pendingDelete.rowBottom}
          onCancel={closeDelete}
          onConfirm={() => {
            closeDelete()
            onDelete(pendingDelete.workout)
          }}
        />
      )}
    </main>
  )
}
