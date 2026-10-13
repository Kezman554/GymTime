import { createId, type NewWorkout, type Workout } from '../storage'

/**
 * What the editor holds while it is open. Numbers stay as the text the user
 * typed so a half-typed or cleared field can be shown and flagged rather than
 * snapped back to a number behind their back.
 */
export interface WorkoutDraft {
  id?: string
  name: string
  exercises: { key: string; name: string }[]
  workSeconds: string
  restSeconds: string
  loops: string
  loopEnabled: boolean
  restBetweenLoopsSeconds: string
}

export const DEFAULT_WORKOUT: NewWorkout = {
  name: '',
  exercises: ['Exercise 1'],
  workSeconds: 45,
  restSeconds: 15,
  loops: 3,
  loopEnabled: true,
  restBetweenLoopsSeconds: 0,
}

export function toDraft(workout: NewWorkout | Workout): WorkoutDraft {
  return {
    id: 'id' in workout ? workout.id : undefined,
    name: workout.name,
    exercises: workout.exercises.map((name) => ({ key: createId(), name })),
    workSeconds: String(workout.workSeconds),
    restSeconds: String(workout.restSeconds),
    loops: String(workout.loops),
    loopEnabled: workout.loopEnabled,
    restBetweenLoopsSeconds: String(workout.restBetweenLoopsSeconds),
  }
}

/** Anything that is not plain digits becomes NaN, which validation rejects. */
export function parseWhole(text: string): number {
  const trimmed = text.trim()
  return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN
}

export function fromDraft(draft: WorkoutDraft): NewWorkout | Workout {
  const workout: NewWorkout = {
    name: draft.name.trim(),
    exercises: draft.exercises.map((exercise) => exercise.name.trim()),
    workSeconds: parseWhole(draft.workSeconds),
    restSeconds: parseWhole(draft.restSeconds),
    loops: parseWhole(draft.loops),
    loopEnabled: draft.loopEnabled,
    restBetweenLoopsSeconds: parseWhole(draft.restBetweenLoopsSeconds),
  }
  return draft.id ? { ...workout, id: draft.id } : workout
}

/** Returns a new array with the item at `from` moved to `to`; out of range is a no-op. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items
  }
  const next = items.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
