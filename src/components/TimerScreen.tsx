import { useEffect, useMemo, useRef, useState } from 'react'
import type { Workout } from '../storage'
import { buildSegments, totalSeconds, type SegmentType } from '../engine/sequence'
import { WorkoutTimer, type TimerState } from '../engine/timer'
import { formatDuration } from '../engine/duration'

const PHASE_LABEL: Record<SegmentType, string> = {
  leadIn: 'Get ready',
  work: 'Work',
  rest: 'Rest',
  loopRest: 'Loop rest',
}

/** Seconds on their own up to a minute; mm:ss above that. */
function clockText(seconds: number): string {
  return seconds > 60 ? formatDuration(seconds) : String(seconds)
}

interface TimerScreenProps {
  workout: Workout
  onDone: () => void
  /** App calls this when Android/browser back is pressed; return true to stay put. */
  setBackInterceptor: (intercept: (() => boolean) | null) => void
}

export function TimerScreen({ workout, onDone, setBackInterceptor }: TimerScreenProps) {
  const segments = useMemo(() => buildSegments(workout), [workout])
  const timerRef = useRef<WorkoutTimer | null>(null)
  const [state, setState] = useState<TimerState | null>(null)
  const [confirmingStop, setConfirmingStop] = useState(false)
  // Wall-clock time including pauses, for the completion screen.
  const wallStart = useRef(0)
  const [wallMs, setWallMs] = useState<number | null>(null)

  useEffect(() => {
    const timer = new WorkoutTimer(segments)
    timerRef.current = timer
    const unsubscribe = [
      timer.on('tick', setState),
      timer.on('workoutComplete', () => setWallMs(Date.now() - wallStart.current)),
    ]
    wallStart.current = Date.now()
    timer.start() // emits the first tick, which fills in state
    return () => {
      unsubscribe.forEach((off) => off())
      timer.stop()
      timerRef.current = null
    }
  }, [segments])

  const status = state?.status ?? 'idle'
  const finished = status === 'complete'

  // Back mid-workout asks to stop rather than silently abandoning it.
  useEffect(() => {
    if (finished) {
      setBackInterceptor(null)
      return
    }
    setBackInterceptor(() => {
      setConfirmingStop(true)
      return true
    })
    return () => setBackInterceptor(null)
  }, [finished, setBackInterceptor])

  if (finished) {
    const workMs = totalSeconds(segments) * 1000
    const pausedSeconds = Math.round(Math.max(0, (wallMs ?? workMs) - workMs) / 1000)
    return (
      <main className="timer timer--complete">
        <div className="timer__body">
          <p className="timer__phase">Workout complete</p>
          <h1 className="timer__exercise">{workout.name}</h1>
          <p className="timer__total-label">Total time</p>
          <p className="timer__total">{formatDuration(totalSeconds(segments))}</p>
          {pausedSeconds > 0 && (
            <p className="timer__meta">plus {formatDuration(pausedSeconds)} paused</p>
          )}
        </div>
        <div className="timer__controls">
          <button type="button" className="btn timer__btn timer__btn--primary" onClick={onDone}>
            Done
          </button>
        </div>
      </main>
    )
  }

  const segment = state?.segment ?? segments[0]
  const seconds = state?.secondsRemaining ?? segment.durationSeconds
  const paused = status === 'paused'
  const isWork = segment.type === 'work'

  const next = isWork
    ? segment.nextExerciseName === null
      ? 'Last one!'
      : `Next: ${segment.nextExerciseName}`
    : null

  return (
    <main className={`timer timer--${segment.type}${paused ? ' is-paused' : ''}`}>
      <div className="timer__body">
        <div className="timer__top">
          <p className="timer__phase">{paused ? 'Paused' : PHASE_LABEL[segment.type]}</p>
          {segment.totalLoops > 1 && (
            <p className="timer__meta">
              Loop {segment.loop} of {segment.totalLoops}
            </p>
          )}
        </div>

        <p className="timer__clock" aria-live="off">
          {clockText(seconds)}
        </p>

        <div className="timer__progress" aria-hidden="true">
          <div
            className="timer__progress-fill"
            style={{ transform: `scaleX(${state?.segmentProgress ?? 0})` }}
          />
        </div>

        {!isWork && <p className="timer__upnext">Up next</p>}
        <h1 className="timer__exercise">{segment.exerciseName}</h1>
        {next && <p className="timer__next">{next}</p>}
      </div>

      <div className="timer__controls">
        {confirmingStop ? (
          <>
            <p className="timer__confirm">Stop this workout?</p>
            {/* Swapped from the row above, so a double-tap on Stop lands on Keep going. */}
            <div className="button-row">
              <button
                type="button"
                className="btn timer__btn timer__btn--stop"
                onClick={() => {
                  timerRef.current?.stop()
                  onDone()
                }}
              >
                Stop
              </button>
              <button
                type="button"
                className="btn timer__btn timer__btn--primary"
                onClick={() => setConfirmingStop(false)}
              >
                Keep going
              </button>
            </div>
          </>
        ) : (
          <div className="button-row">
            <button
              type="button"
              className="btn timer__btn timer__btn--primary"
              onClick={() => (paused ? timerRef.current?.resume() : timerRef.current?.pause())}
            >
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              className="btn timer__btn timer__btn--stop"
              onClick={() => setConfirmingStop(true)}
            >
              Stop
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
