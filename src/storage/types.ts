/** A saved interval workout. Durations are whole seconds. */
export interface Workout {
  id: string
  name: string
  /** Exercise names in the order they are performed. At least one. */
  exercises: string[]
  workSeconds: number
  restSeconds: number
  /** How many times the exercise list repeats. At least 1. */
  loops: number
  /** When false the workout runs the exercise list once, whatever `loops` says. */
  loopEnabled: boolean
  /** Rest between loops. 0 means off. */
  restBetweenLoopsSeconds: number
}

/** Everything but the id — what the editor hands over for a new workout. */
export type NewWorkout = Omit<Workout, 'id'>

export const THEMES = ['light', 'dark'] as const
export type Theme = (typeof THEMES)[number]

/** Accent keys, as carried by data-accent. Colours are in index.css. */
export const ACCENTS = ['red', 'orange', 'sky', 'green', 'brass', 'mono'] as const
export type Accent = (typeof ACCENTS)[number]

/** TEMPORARY: light-ground trial. 'current' is the shipped #E9E5DC. */
export const LIGHT_GROUNDS = ['current', 'a', 'b', 'c', 'd'] as const
export type LightGround = (typeof LIGHT_GROUNDS)[number]

export const MIN_SECONDS = 5
export const MIN_LOOPS = 1

export class WorkoutValidationError extends Error {
  readonly issues: string[]

  constructor(issues: string[]) {
    super(`Invalid workout: ${issues.join('; ')}`)
    this.name = 'WorkoutValidationError'
    this.issues = issues
  }
}

/**
 * Returns the reasons a workout is unusable, newest-first order irrelevant.
 * An empty array means it is valid.
 */
export function validateWorkout(workout: NewWorkout | Workout): string[] {
  const issues: string[] = []

  if (typeof workout.name !== 'string' || workout.name.trim() === '') {
    issues.push('name is required')
  }

  if (!Array.isArray(workout.exercises) || workout.exercises.length < 1) {
    issues.push('at least one exercise is required')
  } else if (workout.exercises.some((name) => typeof name !== 'string' || name.trim() === '')) {
    issues.push('exercise names cannot be blank')
  }

  if (!isWholeNumber(workout.workSeconds) || workout.workSeconds < MIN_SECONDS) {
    issues.push(`work time must be a whole number of at least ${MIN_SECONDS} seconds`)
  }

  if (!isWholeNumber(workout.restSeconds) || workout.restSeconds < MIN_SECONDS) {
    issues.push(`rest time must be a whole number of at least ${MIN_SECONDS} seconds`)
  }

  if (!isWholeNumber(workout.loops) || workout.loops < MIN_LOOPS) {
    issues.push(`loops must be a whole number of at least ${MIN_LOOPS}`)
  }

  // 0 is the documented "off" value; anything else has to clear the floor.
  const betweenLoops = workout.restBetweenLoopsSeconds
  if (!isWholeNumber(betweenLoops) || betweenLoops < 0) {
    issues.push('rest between loops must be a whole number of 0 or more seconds')
  } else if (betweenLoops > 0 && betweenLoops < MIN_SECONDS) {
    issues.push(`rest between loops must be 0 (off) or at least ${MIN_SECONDS} seconds`)
  }

  return issues
}

export function assertValidWorkout(workout: NewWorkout | Workout): void {
  const issues = validateWorkout(workout)
  if (issues.length > 0) {
    throw new WorkoutValidationError(issues)
  }
}

function isWholeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}
