import { describe, expect, it } from 'vitest'
import { buildSegments, LEAD_IN_SECONDS, totalSeconds, type Segment } from '../src/engine/sequence'
import { WorkoutTimer, type Clock } from '../src/engine/timer'
import { workoutDurationSeconds } from '../src/engine/duration'
import { createSeedWorkout, type NewWorkout } from '../src/storage'

/** A clock that only moves when told to, firing interval callbacks as it passes them. */
class FakeClock implements Clock {
  private time = 0
  private nextId = 1
  private readonly timers = new Map<number, { callback: () => void; ms: number; due: number }>()

  now(): number {
    return this.time
  }

  setInterval(callback: () => void, ms: number): unknown {
    const id = this.nextId++
    this.timers.set(id, { callback, ms, due: this.time + ms })
    return id
  }

  clearInterval(handle: unknown): void {
    this.timers.delete(handle as number)
  }

  /** Moves time forward, running each interval callback at its due time. */
  advance(ms: number): void {
    const target = this.time + ms
    for (;;) {
      let soonest: { id: number; due: number } | null = null
      for (const [id, timer] of this.timers) {
        if (timer.due <= target && (soonest === null || timer.due < soonest.due)) {
          soonest = { id, due: timer.due }
        }
      }
      if (soonest === null) break
      const timer = this.timers.get(soonest.id)!
      this.time = soonest.due
      timer.due += timer.ms
      timer.callback()
    }
    this.time = target
  }

  /** Moves time without firing anything, like a throttled or frozen WebView. */
  jump(ms: number): void {
    this.time += ms
    for (const timer of this.timers.values()) timer.due = Math.max(timer.due, this.time)
  }
}

const core15 = createSeedWorkout() // 5 exercises, 45/15, 3 loops, no between-loop rest

function workout(overrides: Partial<NewWorkout> = {}): NewWorkout {
  return { ...core15, exercises: ['Plank', 'Crunch', 'Bridge', 'Twist', 'Dead bug'], ...overrides }
}

function record(timer: WorkoutTimer, clock: Clock) {
  const log: { at: number; event: string; detail?: string | number }[] = []
  timer.on('segmentStart', (segment, index) =>
    log.push({ at: clock.now(), event: 'segmentStart', detail: `${index}:${segment.type}` }),
  )
  timer.on('countdownTick', (n) => log.push({ at: clock.now(), event: 'countdown', detail: n }))
  timer.on('workoutComplete', () => log.push({ at: clock.now(), event: 'complete' }))
  return log
}

describe('buildSegments', () => {
  it('runs 5 x 45/15 x 3 as 14:45 of work and rest plus a 5s lead-in = 14:50', () => {
    const segments = buildSegments(workout())
    expect(segments).toHaveLength(1 + 15 + 14)
    expect(segments[0]).toMatchObject({ type: 'leadIn', durationSeconds: LEAD_IN_SECONDS })
    expect(totalSeconds(segments.slice(1))).toBe(14 * 60 + 45)
    expect(totalSeconds(segments)).toBe(14 * 60 + 50)
  })

  it('alternates work and rest, ending on work with the final rest skipped', () => {
    const types = buildSegments(workout()).map((segment) => segment.type)
    expect(types.slice(1, 5)).toEqual(['work', 'rest', 'work', 'rest'])
    expect(types.at(-1)).toBe('work')
    expect(types.filter((type) => type === 'work')).toHaveLength(15)
    expect(types.filter((type) => type === 'rest')).toHaveLength(14)
  })

  it('fills in names, next names, loop and index', () => {
    const segments = buildSegments(workout())
    expect(segments[0]).toMatchObject({
      exerciseName: 'Plank',
      nextExerciseName: 'Plank',
      loop: 1,
      totalLoops: 3,
      exerciseIndex: 0,
    })
    // work Plank -> rest (next up Crunch)
    expect(segments[1]).toMatchObject({ type: 'work', exerciseName: 'Plank', nextExerciseName: 'Crunch', loop: 1, exerciseIndex: 0 })
    expect(segments[2]).toMatchObject({ type: 'rest', exerciseName: 'Crunch', nextExerciseName: 'Crunch', loop: 1, exerciseIndex: 1 })
    // last exercise of loop 1 -> rest announcing loop 2's first exercise
    expect(segments[9]).toMatchObject({ type: 'work', exerciseName: 'Dead bug', nextExerciseName: 'Plank', loop: 1, exerciseIndex: 4 })
    expect(segments[10]).toMatchObject({ type: 'rest', exerciseName: 'Plank', loop: 2, exerciseIndex: 0 })
    // very last work has nothing after it
    expect(segments.at(-1)).toMatchObject({ type: 'work', exerciseName: 'Dead bug', nextExerciseName: null, loop: 3, exerciseIndex: 4 })
  })

  it('swaps the boundary rest for the between-loop rest when it is on', () => {
    const segments = buildSegments(workout({ restBetweenLoopsSeconds: 60 }))
    const loopRests = segments.filter((segment) => segment.type === 'loopRest')
    expect(loopRests).toHaveLength(2)
    expect(loopRests.map((segment) => segment.loop)).toEqual([2, 3])
    expect(loopRests.every((segment) => segment.durationSeconds === 60)).toBe(true)
    expect(segments.filter((segment) => segment.type === 'rest')).toHaveLength(12)
    expect(segments[10]).toMatchObject({ type: 'loopRest', exerciseName: 'Plank', loop: 2 })
    expect(totalSeconds(segments)).toBe(5 + 15 * 45 + 12 * 15 + 2 * 60)
  })

  it('ignores the between-loop rest and the loop count when looping is off', () => {
    const segments = buildSegments(workout({ loopEnabled: false, restBetweenLoopsSeconds: 60 }))
    expect(segments).toHaveLength(1 + 5 + 4)
    expect(segments.every((segment) => segment.totalLoops === 1)).toBe(true)
  })

  it('agrees with the editor total for every shape', () => {
    for (const overrides of [
      {},
      { restBetweenLoopsSeconds: 30 },
      { loopEnabled: false },
      { exercises: ['Solo'] },
      { exercises: ['Solo'], restBetweenLoopsSeconds: 20, loops: 4 },
    ]) {
      const w = workout(overrides)
      expect(totalSeconds(buildSegments(w))).toBe(
        LEAD_IN_SECONDS + workoutDurationSeconds({ ...w, exerciseCount: w.exercises.length }),
      )
    }
  })

  it('is empty with no exercises', () => {
    expect(buildSegments(workout({ exercises: [] }))).toEqual([])
  })
})

describe('WorkoutTimer', () => {
  const short = () =>
    buildSegments(workout({ exercises: ['A', 'B'], workSeconds: 10, restSeconds: 5, loops: 1 }))
  // leadIn 5 | work A 10 | rest 5 | work B 10  => ends at 5, 15, 20, 30 s

  it('starts idle and announces the lead-in on start', () => {
    const clock = new FakeClock()
    const timer = new WorkoutTimer(short(), { clock })
    expect(timer.getState()).toMatchObject({ status: 'idle', segment: null })
    const log = record(timer, clock)
    timer.start()
    expect(log).toEqual([{ at: 0, event: 'segmentStart', detail: '0:leadIn' }])
    expect(timer.getState()).toMatchObject({ status: 'running', segmentIndex: 0, secondsRemaining: 5, progress: 0 })
  })

  it('emits segment starts, 3-2-1 before each switch, and completion at the right times', () => {
    const clock = new FakeClock()
    const timer = new WorkoutTimer(short(), { clock })
    const log = record(timer, clock)
    timer.start()
    clock.advance(31_000)

    expect(log.filter((entry) => entry.event === 'segmentStart')).toEqual([
      { at: 0, event: 'segmentStart', detail: '0:leadIn' },
      { at: 5000, event: 'segmentStart', detail: '1:work' },
      { at: 15000, event: 'segmentStart', detail: '2:rest' },
      { at: 20000, event: 'segmentStart', detail: '3:work' },
    ])
    const countdowns = log.filter((entry) => entry.event === 'countdown')
    expect(countdowns.map((entry) => entry.detail)).toEqual([3, 2, 1, 3, 2, 1, 3, 2, 1, 3, 2, 1])
    expect(countdowns.slice(0, 3).map((entry) => entry.at)).toEqual([2000, 3000, 4000])
    expect(countdowns.slice(-3).map((entry) => entry.at)).toEqual([27000, 28000, 29000])
    expect(log.filter((entry) => entry.event === 'complete')).toEqual([{ at: 30000, event: 'complete' }])
    expect(timer.getState()).toMatchObject({ status: 'complete', progress: 1, secondsRemaining: 0 })
  })

  it('reports seconds remaining rounded up and progress through the segment', () => {
    const clock = new FakeClock()
    const timer = new WorkoutTimer(short(), { clock })
    timer.start()
    clock.advance(5000 + 2500) // 2.5s into work A (10s)
    expect(timer.getState()).toMatchObject({ segmentIndex: 1, secondsRemaining: 8, segmentProgress: 0.25 })
    expect(timer.getState().progress).toBeCloseTo(7.5 / 30)
  })

  it('stands still while paused and carries on from the same point', () => {
    const clock = new FakeClock()
    const timer = new WorkoutTimer(short(), { clock })
    const log = record(timer, clock)
    timer.start()
    clock.advance(7000) // 2s into work A
    timer.pause()
    const paused = timer.getState()
    expect(paused).toMatchObject({ status: 'paused', segmentIndex: 1, secondsRemaining: 8, elapsedMs: 7000 })

    clock.advance(60_000)
    expect(timer.getState()).toEqual(paused)
    expect(log.filter((entry) => entry.at > 7000)).toEqual([])

    timer.resume()
    clock.advance(8000) // the 8s left of work A
    expect(timer.getState()).toMatchObject({ segmentIndex: 2, elapsedMs: 15000 })
    expect(log.find((entry) => entry.detail === '2:rest')?.at).toBe(67000 + 8000)

    clock.advance(15_000)
    expect(log.at(-1)).toEqual({ at: 7000 + 60_000 + 23_000, event: 'complete' })
  })

  it('does not double-fire a countdown second when paused inside it', () => {
    const clock = new FakeClock()
    const timer = new WorkoutTimer(short(), { clock })
    const log = record(timer, clock)
    timer.start()
    clock.advance(2500) // inside "3"
    timer.pause()
    clock.advance(5000)
    timer.resume()
    clock.advance(2500)
    expect(log.filter((entry) => entry.event === 'countdown').map((entry) => entry.detail)).toEqual([3, 2, 1])
  })

  it('stop halts without completing, and start begins again from the top', () => {
    const clock = new FakeClock()
    const timer = new WorkoutTimer(short(), { clock })
    const log = record(timer, clock)
    timer.start()
    clock.advance(12_000)
    timer.stop()
    expect(timer.getState()).toMatchObject({ status: 'stopped', elapsedMs: 12000 })
    clock.advance(60_000)
    expect(log.some((entry) => entry.event === 'complete')).toBe(false)

    log.length = 0
    timer.start()
    expect(timer.getState()).toMatchObject({ status: 'running', segmentIndex: 0, elapsedMs: 0 })
    expect(log).toEqual([{ at: 72000, event: 'segmentStart', detail: '0:leadIn' }])
  })

  it('ignores calls that make no sense in the current state', () => {
    const clock = new FakeClock()
    const timer = new WorkoutTimer(short(), { clock })
    timer.pause()
    timer.resume()
    timer.stop()
    expect(timer.getState().status).toBe('idle')
    timer.start()
    clock.advance(1000)
    timer.start() // already running: not a restart
    expect(timer.getState().elapsedMs).toBe(1000)
  })

  it('drops cues it slept through instead of firing them in a burst', () => {
    const clock = new FakeClock()
    const timer = new WorkoutTimer(short(), { clock })
    const log = record(timer, clock)
    timer.start()
    clock.jump(16_500) // asleep from the lead-in to 1.5s into the rest
    clock.advance(100) // the overdue tick fires on waking
    const late = log.filter((entry) => entry.at > 0)
    expect(late).toEqual([{ at: 16500, event: 'segmentStart', detail: '2:rest' }])
  })

  it('keeps going when a listener throws', () => {
    const clock = new FakeClock()
    const timer = new WorkoutTimer(short(), { clock })
    const errors: unknown[] = []
    const original = console.error
    console.error = (...args: unknown[]) => errors.push(args)
    try {
      timer.on('segmentStart', () => {
        throw new Error('speech failed')
      })
      const log = record(timer, clock)
      timer.start()
      clock.advance(31_000)
      expect(log.at(-1)?.event).toBe('complete')
      expect(errors.length).toBe(4)
    } finally {
      console.error = original
    }
  })

  it('does not drift over a simulated 15 minutes of late, irregular ticks', () => {
    const segments = buildSegments(workout())
    const clock = new FakeClock()
    const timer = new WorkoutTimer(segments, { clock, tickMs: 250 })
    const log = record(timer, clock)

    // Deterministic jitter: every tick is 0-180ms late, and one in twenty
    // stalls for over a second, as a busy or throttled WebView would.
    let seed = 42
    const random = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31
    timer.start()
    while (timer.getState().status === 'running') {
      clock.jump(random() < 0.05 ? 1000 + random() * 500 : random() * 180)
      clock.advance(250)
    }

    const expectedEnd = (14 * 60 + 50) * 1000
    const completedAt = log.find((entry) => entry.event === 'complete')!.at
    // Completion is noticed on the first wake after the true end; never before.
    expect(completedAt).toBeGreaterThanOrEqual(expectedEnd)
    expect(completedAt - expectedEnd).toBeLessThan(2000)
    expect(timer.getState().elapsedMs).toBe(expectedEnd)

    // Every segment start fired late by no more than one wake-up, never early.
    let boundary = 0
    const expectedStarts = segments.map((segment: Segment) => {
      const at = boundary
      boundary += segment.durationSeconds * 1000
      return at
    })
    const starts = log.filter((entry) => entry.event === 'segmentStart')
    expect(starts).toHaveLength(segments.length)
    starts.forEach((entry, i) => {
      expect(entry.at - expectedStarts[i]).toBeGreaterThanOrEqual(0)
      expect(entry.at - expectedStarts[i]).toBeLessThan(2000)
    })
  })

  it('does not drift with perfect ticks either: the last segment starts at exactly 14:45', () => {
    const clock = new FakeClock()
    const timer = new WorkoutTimer(buildSegments(workout()), { clock, tickMs: 100 })
    const log = record(timer, clock)
    timer.start()
    clock.advance(15 * 60 * 1000)
    const starts = log.filter((entry) => entry.event === 'segmentStart')
    expect(starts.at(-1)!.at).toBe((14 * 60 + 50 - 45) * 1000)
    expect(log.at(-1)).toEqual({ at: (14 * 60 + 50) * 1000, event: 'complete' })
  })
})
