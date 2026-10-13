import { describe, expect, it } from 'vitest'
import {
  MemoryKeyValueStore,
  WorkoutStore,
  WorkoutValidationError,
  validateWorkout,
  type NewWorkout,
} from '../src/storage'

function aWorkout(overrides: Partial<NewWorkout> = {}): NewWorkout {
  return {
    name: 'Core 15',
    exercises: ['Plank'],
    workSeconds: 45,
    restSeconds: 15,
    loops: 3,
    loopEnabled: true,
    restBetweenLoopsSeconds: 0,
    ...overrides,
  }
}

describe('validateWorkout', () => {
  it('accepts a minimal valid workout', () => {
    expect(validateWorkout(aWorkout())).toEqual([])
  })

  it('requires at least one exercise', () => {
    expect(validateWorkout(aWorkout({ exercises: [] }))).toContain(
      'at least one exercise is required',
    )
  })

  it('rejects blank exercise names', () => {
    expect(validateWorkout(aWorkout({ exercises: ['Plank', '  '] }))).toContain(
      'exercise names cannot be blank',
    )
  })

  it('requires a name', () => {
    expect(validateWorkout(aWorkout({ name: '   ' }))).toContain('name is required')
  })

  it.each([4, 0, -10])('rejects work time of %i seconds', (workSeconds) => {
    expect(validateWorkout(aWorkout({ workSeconds }))).toHaveLength(1)
  })

  it('accepts work and rest at exactly the 5 second floor', () => {
    expect(validateWorkout(aWorkout({ workSeconds: 5, restSeconds: 5 }))).toEqual([])
  })

  it.each([4, 0])('rejects rest time of %i seconds', (restSeconds) => {
    expect(validateWorkout(aWorkout({ restSeconds }))).toHaveLength(1)
  })

  it('rejects fewer than one loop', () => {
    expect(validateWorkout(aWorkout({ loops: 0 }))).toHaveLength(1)
  })

  it('rejects fractional seconds and loops', () => {
    expect(validateWorkout(aWorkout({ workSeconds: 45.5 }))).toHaveLength(1)
    expect(validateWorkout(aWorkout({ loops: 2.5 }))).toHaveLength(1)
  })

  it('treats 0 between-loop rest as off, not invalid', () => {
    expect(validateWorkout(aWorkout({ restBetweenLoopsSeconds: 0 }))).toEqual([])
  })

  it('rejects a between-loop rest that is on but below the floor', () => {
    expect(validateWorkout(aWorkout({ restBetweenLoopsSeconds: 3 }))).toContain(
      'rest between loops must be 0 (off) or at least 5 seconds',
    )
  })

  it('accepts a between-loop rest at or above the floor', () => {
    expect(validateWorkout(aWorkout({ restBetweenLoopsSeconds: 60 }))).toEqual([])
  })

  it('reports every problem at once, not just the first', () => {
    const issues = validateWorkout(aWorkout({ exercises: [], workSeconds: 1, loops: 0 }))
    expect(issues).toHaveLength(3)
  })
})

describe('saveWorkout validation', () => {
  it('refuses to persist an invalid workout and leaves storage untouched', async () => {
    const store = new WorkoutStore(new MemoryKeyValueStore())

    await expect(store.saveWorkout(aWorkout({ exercises: [] }))).rejects.toBeInstanceOf(
      WorkoutValidationError,
    )
    expect(await store.listWorkouts()).toEqual([])
  })

  it('carries the issues on the error', async () => {
    const store = new WorkoutStore(new MemoryKeyValueStore())

    await expect(
      store.saveWorkout(aWorkout({ workSeconds: 2, loops: 0 })),
    ).rejects.toMatchObject({ issues: expect.arrayContaining([expect.any(String)]) })
  })

  it('does not corrupt an existing workout when an update is invalid', async () => {
    const store = new WorkoutStore(new MemoryKeyValueStore())
    const saved = await store.saveWorkout(aWorkout())

    await expect(store.saveWorkout({ ...saved, workSeconds: 0 })).rejects.toBeInstanceOf(
      WorkoutValidationError,
    )
    expect((await store.getWorkout(saved.id))?.workSeconds).toBe(45)
  })
})
