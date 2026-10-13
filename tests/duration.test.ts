import { describe, expect, it } from 'vitest'
import { formatDuration, workoutDurationSeconds, type WorkoutTiming } from '../src/engine/duration'

const core15: WorkoutTiming = {
  exerciseCount: 5,
  workSeconds: 45,
  restSeconds: 15,
  loops: 3,
  loopEnabled: true,
  restBetweenLoopsSeconds: 0,
}

describe('workoutDurationSeconds', () => {
  it('skips only the final rest of the whole workout', () => {
    // 15 work periods of 45s, 14 rests of 15s
    expect(workoutDurationSeconds(core15)).toBe(15 * 45 + 14 * 15)
  })

  it('replaces the loop-boundary rest when rest between loops is on', () => {
    const timing = { ...core15, restBetweenLoopsSeconds: 60 }
    // 12 in-loop rests of 15s, 2 boundary rests of 60s
    expect(workoutDurationSeconds(timing)).toBe(15 * 45 + 12 * 15 + 2 * 60)
  })

  it('runs the list once when looping is off, whatever loops says', () => {
    const timing = { ...core15, loopEnabled: false, restBetweenLoopsSeconds: 60 }
    expect(workoutDurationSeconds(timing)).toBe(5 * 45 + 4 * 15)
  })

  it('is just the work time for a single exercise run once', () => {
    expect(workoutDurationSeconds({ ...core15, exerciseCount: 1, loopEnabled: false })).toBe(45)
  })

  it('uses only boundary rests when there is one exercise per loop', () => {
    expect(workoutDurationSeconds({ ...core15, exerciseCount: 1 })).toBe(3 * 45 + 2 * 15)
  })

  it('is 0 with no exercises', () => {
    expect(workoutDurationSeconds({ ...core15, exerciseCount: 0 })).toBe(0)
  })
})

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [5, '0:05'],
    [885, '14:45'],
    [3600, '1:00:00'],
    [3725, '1:02:05'],
  ])('%i -> %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected)
  })
})
