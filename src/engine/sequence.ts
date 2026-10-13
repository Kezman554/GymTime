import type { NewWorkout } from '../storage/types'

export const LEAD_IN_SECONDS = 5

export type SegmentType = 'leadIn' | 'work' | 'rest' | 'loopRest'

export interface Segment {
  type: SegmentType
  durationSeconds: number
  /**
   * The exercise the screen should headline. For work it is the exercise being
   * done; for lead-in and rests it is the one coming up, since that is what you
   * need to know while you wait.
   */
  exerciseName: string
  /**
   * What follows this segment's exercise. For work, the next exercise to be
   * worked (null after the last one of the workout); for lead-in and rests it
   * equals exerciseName — "Rest. Next up: {nextExerciseName}".
   */
  nextExerciseName: string | null
  /** 1-based loop that exerciseName belongs to. */
  loop: number
  totalLoops: number
  /** 0-based position of exerciseName in the workout's exercise list. */
  exerciseIndex: number
}

type SequenceInput = Pick<
  NewWorkout,
  'exercises' | 'workSeconds' | 'restSeconds' | 'loops' | 'loopEnabled' | 'restBetweenLoopsSeconds'
>

/**
 * Flattens a workout into the segments the timer runs, in order.
 *
 * Lead-in, then every exercise of every loop as work. A rest follows each
 * work except the very last of the workout. At a loop boundary the
 * between-loops rest replaces the normal rest when it is on (non-zero).
 */
export function buildSegments(workout: SequenceInput): Segment[] {
  const { exercises } = workout
  if (exercises.length === 0) return []

  const totalLoops = workout.loopEnabled ? Math.max(1, workout.loops) : 1
  const plan: { name: string; index: number; loop: number }[] = []
  for (let loop = 1; loop <= totalLoops; loop++) {
    exercises.forEach((name, index) => plan.push({ name, index, loop }))
  }

  const upcoming = (step: (typeof plan)[number], type: SegmentType, durationSeconds: number) => ({
    type,
    durationSeconds,
    exerciseName: step.name,
    nextExerciseName: step.name,
    loop: step.loop,
    totalLoops,
    exerciseIndex: step.index,
  })

  const segments: Segment[] = [upcoming(plan[0], 'leadIn', LEAD_IN_SECONDS)]

  plan.forEach((step, i) => {
    const next = plan[i + 1]
    segments.push({
      type: 'work',
      durationSeconds: workout.workSeconds,
      exerciseName: step.name,
      nextExerciseName: next ? next.name : null,
      loop: step.loop,
      totalLoops,
      exerciseIndex: step.index,
    })
    if (!next) return // final rest skipped
    const loopBoundary = next.loop !== step.loop
    if (loopBoundary && workout.restBetweenLoopsSeconds > 0) {
      segments.push(upcoming(next, 'loopRest', workout.restBetweenLoopsSeconds))
    } else {
      segments.push(upcoming(next, 'rest', workout.restSeconds))
    }
  })

  return segments
}

export function totalSeconds(segments: Segment[]): number {
  return segments.reduce((sum, segment) => sum + segment.durationSeconds, 0)
}
