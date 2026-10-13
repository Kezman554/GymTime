import type { Segment } from './sequence'

/**
 * Where the timer gets time and how it gets woken. Real code uses
 * performance.now and setInterval; tests swap in a clock they advance by hand.
 */
export interface Clock {
  now(): number
  setInterval(callback: () => void, ms: number): unknown
  clearInterval(handle: unknown): void
}

export const systemClock: Clock = {
  now: () => performance.now(),
  setInterval: (callback, ms) => globalThis.setInterval(callback, ms),
  clearInterval: (handle) => globalThis.clearInterval(handle as ReturnType<typeof setInterval>),
}

export type TimerStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'complete'

export interface TimerState {
  status: TimerStatus
  /** -1 before start. Stays on the last segment once complete. */
  segmentIndex: number
  segment: Segment | null
  /** Whole seconds left in the segment, rounded up: shows 45 for the first second. */
  secondsRemaining: number
  /** 0..1 through the current segment. */
  segmentProgress: number
  /** 0..1 through the whole workout. */
  progress: number
  elapsedMs: number
}

export interface TimerEvents {
  segmentStart: (segment: Segment, index: number) => void
  /** Fires as the current segment reaches 3, 2 and 1 seconds remaining. */
  countdownTick: (secondsRemaining: 3 | 2 | 1, segment: Segment) => void
  workoutComplete: () => void
  /** Every wake-up while running, for redrawing the clock. */
  tick: (state: TimerState) => void
}

export interface TimerOptions {
  clock?: Clock
  /** How often to wake and re-read the clock. Accuracy never depends on it. */
  tickMs?: number
}

type Listeners = { [K in keyof TimerEvents]: Set<TimerEvents[K]> }

/**
 * Runs a segment list against real timestamps. Elapsed time is always
 * clock.now() minus the start, less any time paused; ticks only decide how
 * often that is looked at, so a late or dropped tick cannot cause drift.
 *
 * When ticks arrive late enough to jump over boundaries (a throttled WebView),
 * only the segment now current gets a segmentStart, and only a countdown
 * second that is current gets a countdownTick. Stale cues are dropped rather
 * than fired in a burst.
 */
export class WorkoutTimer {
  private readonly segments: Segment[]
  private readonly clock: Clock
  private readonly tickMs: number
  /** Cumulative end of each segment in ms from start. Integers, so no float creep. */
  private readonly ends: number[]
  private readonly totalMs: number
  private readonly listeners: Listeners = {
    segmentStart: new Set(),
    countdownTick: new Set(),
    workoutComplete: new Set(),
    tick: new Set(),
  }

  private status: TimerStatus = 'idle'
  /** clock time at which elapsed was 0, shifted forward by each pause. */
  private startedAt = 0
  private pausedElapsed = 0
  private interval: unknown = null
  private announcedSegment = -1
  private lastCountdown = ''

  constructor(segments: Segment[], options: TimerOptions = {}) {
    this.segments = segments
    this.clock = options.clock ?? systemClock
    this.tickMs = options.tickMs ?? 100
    let sum = 0
    this.ends = segments.map((segment) => (sum += segment.durationSeconds * 1000))
    this.totalMs = sum
  }

  on<K extends keyof TimerEvents>(event: K, listener: TimerEvents[K]): () => void {
    this.listeners[event].add(listener)
    return () => this.listeners[event].delete(listener)
  }

  /** Starts from the beginning. Also restarts a stopped or completed workout. */
  start(): void {
    if (this.status === 'running' || this.status === 'paused') return
    if (this.segments.length === 0) return
    this.announcedSegment = -1
    this.lastCountdown = ''
    this.startedAt = this.clock.now()
    this.status = 'running'
    this.startTicking()
    this.tick()
  }

  pause(): void {
    if (this.status !== 'running') return
    this.pausedElapsed = this.elapsed()
    this.status = 'paused'
    this.stopTicking()
    this.emit('tick', this.getState())
  }

  resume(): void {
    if (this.status !== 'paused') return
    this.startedAt = this.clock.now() - this.pausedElapsed
    this.status = 'running'
    this.startTicking()
    this.tick()
  }

  stop(): void {
    if (this.status !== 'running' && this.status !== 'paused') return
    this.pausedElapsed = this.elapsed()
    this.status = 'stopped'
    this.stopTicking()
  }

  getState(): TimerState {
    const elapsedMs = this.elapsed()
    if (this.status === 'idle') {
      return {
        status: 'idle',
        segmentIndex: -1,
        segment: null,
        secondsRemaining: 0,
        segmentProgress: 0,
        progress: 0,
        elapsedMs: 0,
      }
    }
    const index = this.indexAt(elapsedMs)
    const segment = this.segments[index]
    const segmentMs = segment.durationSeconds * 1000
    const remainingMs = Math.max(0, this.ends[index] - elapsedMs)
    return {
      status: this.status,
      segmentIndex: index,
      segment,
      secondsRemaining: Math.ceil(remainingMs / 1000),
      segmentProgress: segmentMs === 0 ? 1 : 1 - remainingMs / segmentMs,
      progress: this.totalMs === 0 ? 1 : elapsedMs / this.totalMs,
      elapsedMs,
    }
  }

  /** Re-reads the clock and fires whatever is due. Normally driven by the interval. */
  tick(): void {
    if (this.status !== 'running') return

    if (this.elapsed() >= this.totalMs) {
      this.status = 'complete'
      this.stopTicking()
      this.emit('tick', this.getState())
      this.emit('workoutComplete')
      return
    }

    const state = this.getState()
    const { segmentIndex, segment, secondsRemaining } = state
    if (segment === null) return

    if (segmentIndex !== this.announcedSegment) {
      this.announcedSegment = segmentIndex
      this.emit('segmentStart', segment, segmentIndex)
    }

    if (secondsRemaining >= 1 && secondsRemaining <= 3) {
      const key = `${segmentIndex}:${secondsRemaining}`
      if (key !== this.lastCountdown) {
        this.lastCountdown = key
        this.emit('countdownTick', secondsRemaining as 3 | 2 | 1, segment)
      }
    }

    this.emit('tick', state)
  }

  private elapsed(): number {
    switch (this.status) {
      case 'idle':
        return 0
      case 'running':
        return Math.min(this.totalMs, this.clock.now() - this.startedAt)
      case 'complete':
        return this.totalMs
      default:
        return this.pausedElapsed
    }
  }

  private indexAt(elapsedMs: number): number {
    // A boundary instant belongs to the segment that starts there.
    const index = this.ends.findIndex((end) => elapsedMs < end)
    return index === -1 ? this.segments.length - 1 : index
  }

  private startTicking(): void {
    this.stopTicking()
    this.interval = this.clock.setInterval(() => this.tick(), this.tickMs)
  }

  private stopTicking(): void {
    if (this.interval !== null) {
      this.clock.clearInterval(this.interval)
      this.interval = null
    }
  }

  private emit<K extends keyof TimerEvents>(event: K, ...args: Parameters<TimerEvents[K]>): void {
    for (const listener of this.listeners[event]) {
      try {
        ;(listener as (...a: Parameters<TimerEvents[K]>) => void)(...args)
      } catch (error) {
        // A failing cue (speech, audio) must not stop the clock.
        console.error(`GymTime timer: ${event} listener threw`, error)
      }
    }
  }
}
