import { useEffect, useMemo, useRef, useState } from 'react'
import type { Settings, Workout } from '../storage'
import { buildSegments, totalSeconds, type SegmentType } from '../engine/sequence'
import { WorkoutTimer, type TimerState } from '../engine/timer'
import { formatDuration } from '../engine/duration'
import { allowScreenSleep, keepScreenOn } from '../native/keepAwake'
import { onReturnToForeground } from '../native/appState'
import { getSpeech } from '../audio/speech'
import { COMPLETE_CUE, segmentCue } from '../audio/cues'
import { getBeeps } from '../audio/beeps'

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
  /** Read once at start; sound can only be changed on Home. */
  settings: Settings
  onDone: () => void
  /** App calls this when Android/browser back is pressed; return true to stay put. */
  setBackInterceptor: (intercept: (() => boolean) | null) => void
}

export function TimerScreen({ workout, settings, onDone, setBackInterceptor }: TimerScreenProps) {
  const segments = useMemo(() => buildSegments(workout), [workout])
  const timerRef = useRef<WorkoutTimer | null>(null)
  const [state, setState] = useState<TimerState | null>(null)
  const [confirmingStop, setConfirmingStop] = useState(false)
  // Wall-clock time including pauses, for the completion screen.
  const wallStart = useRef(0)
  const [wallMs, setWallMs] = useState<number | null>(null)

  useEffect(() => {
    const timer = new WorkoutTimer(segments)
    const speech = getSpeech()
    const beeps = getBeeps()
    const { speech: speak, beeps: beep } = settings
    timerRef.current = timer
    const unsubscribe = [
      timer.on('tick', setState),
      timer.on('segmentStart', (segment) => speak && speech.say(segmentCue(segment))),
      timer.on('countdownTick', (seconds) => beep && beeps.beep(seconds)),
      timer.on('workoutComplete', () => {
        setWallMs(Date.now() - wallStart.current)
        if (speak) speech.say(COMPLETE_CUE)
      }),
    ]
    wallStart.current = Date.now()
    timer.start() // emits the first tick and the lead-in cue
    return () => {
      unsubscribe.forEach((off) => off())
      // Stopped or abandoned: cut speech off. Finished: let "Workout complete" play out.
      if (timer.getState().status !== 'complete') speech.cancel()
      timer.stop()
      timerRef.current = null
    }
  }, [segments, settings])

  const status = state?.status ?? 'idle'
  const finished = status === 'complete'

  // Screen stays on while running or paused; sleep is allowed again on
  // stop, completion or leaving the screen.
  const holdScreen = status === 'running' || status === 'paused'
  useEffect(() => {
    if (!holdScreen) return
    keepScreenOn()
    return allowScreenSleep
  }, [holdScreen])

  // Timers are throttled or frozen in the background. Elapsed time is always
  // derived from timestamps, so on return one immediate tick puts the clock,
  // segment and progress right without waiting for the next interval.
  useEffect(
    () =>
      onReturnToForeground(() => {
        const timer = timerRef.current
        if (!timer) return
        timer.tick()
        // The browser drops a wake lock when hidden; re-take it on return.
        const { status: now } = timer.getState()
        if (now === 'running' || now === 'paused') keepScreenOn()
      }),
    [],
  )

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
