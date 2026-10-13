import type { NewWorkout } from '../storage/types'

export type WorkoutTiming = Pick<
  NewWorkout,
  'workSeconds' | 'restSeconds' | 'loops' | 'loopEnabled' | 'restBetweenLoopsSeconds'
> & { exerciseCount: number }

/**
 * Total running time in seconds, excluding the lead-in.
 *
 * Every exercise is followed by a rest except the very last one of the
 * workout. At a loop boundary the between-loops rest replaces the normal rest
 * when it is switched on (non-zero); otherwise the normal rest applies there
 * too, so the circuit flows straight on.
 */
export function workoutDurationSeconds(timing: WorkoutTiming): number {
  const { exerciseCount, workSeconds, restSeconds, restBetweenLoopsSeconds } = timing
  if (exerciseCount < 1) return 0
  const loops = timing.loopEnabled ? Math.max(1, timing.loops) : 1

  const perLoop = exerciseCount * workSeconds + (exerciseCount - 1) * restSeconds
  const boundaryRest = restBetweenLoopsSeconds > 0 ? restBetweenLoopsSeconds : restSeconds
  return loops * perLoop + (loops - 1) * boundaryRest
}

/** 885 -> "14:45", 3725 -> "1:02:05". */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  const ss = String(seconds).padStart(2, '0')
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${ss}`
  return `${minutes}:${ss}`
}
