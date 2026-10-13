import { beforeEach, describe, expect, it } from 'vitest'
import {
  MemoryKeyValueStore,
  SEED_WORKOUT_NAME,
  WorkoutStore,
  createSeedWorkout,
  type NewWorkout,
} from '../src/storage'

function aWorkout(overrides: Partial<NewWorkout> = {}): NewWorkout {
  return {
    name: 'Legs',
    exercises: ['Squats', 'Lunges'],
    workSeconds: 40,
    restSeconds: 20,
    loops: 2,
    loopEnabled: true,
    restBetweenLoopsSeconds: 0,
    ...overrides,
  }
}

describe('WorkoutStore', () => {
  let store: WorkoutStore

  beforeEach(() => {
    store = new WorkoutStore(new MemoryKeyValueStore())
  })

  it('starts empty', async () => {
    expect(await store.listWorkouts()).toEqual([])
    expect(await store.getLastUsedWorkoutId()).toBeNull()
  })

  it('saves a new workout and gives it an id', async () => {
    const saved = await store.saveWorkout(aWorkout())
    expect(saved.id).toMatch(/.+/)
    expect(saved.name).toBe('Legs')
    expect(await store.listWorkouts()).toHaveLength(1)
  })

  it('loads a saved workout back by id', async () => {
    const saved = await store.saveWorkout(aWorkout())
    expect(await store.getWorkout(saved.id)).toEqual(saved)
  })

  it('returns null for an unknown id', async () => {
    expect(await store.getWorkout('nope')).toBeNull()
  })

  it('updates in place rather than appending when the id is known', async () => {
    const saved = await store.saveWorkout(aWorkout())
    const updated = await store.saveWorkout({ ...saved, name: 'Legs and core', loops: 4 })

    expect(updated.id).toBe(saved.id)
    expect(await store.listWorkouts()).toHaveLength(1)
    const reloaded = await store.getWorkout(saved.id)
    expect(reloaded?.name).toBe('Legs and core')
    expect(reloaded?.loops).toBe(4)
  })

  it('keeps workouts in save order and gives each a distinct id', async () => {
    const first = await store.saveWorkout(aWorkout({ name: 'One' }))
    const second = await store.saveWorkout(aWorkout({ name: 'Two' }))

    expect(first.id).not.toBe(second.id)
    expect((await store.listWorkouts()).map((w) => w.name)).toEqual(['One', 'Two'])
  })

  it('trims the name on save', async () => {
    const saved = await store.saveWorkout(aWorkout({ name: '  Core 15  ' }))
    expect(saved.name).toBe('Core 15')
  })

  it('deletes a workout and reports whether anything went', async () => {
    const saved = await store.saveWorkout(aWorkout())
    expect(await store.deleteWorkout(saved.id)).toBe(true)
    expect(await store.listWorkouts()).toEqual([])
    expect(await store.deleteWorkout(saved.id)).toBe(false)
  })

  it('clears the last-used pointer when that workout is deleted', async () => {
    const keep = await store.saveWorkout(aWorkout({ name: 'Keep' }))
    const drop = await store.saveWorkout(aWorkout({ name: 'Drop' }))
    await store.setLastUsedWorkoutId(drop.id)

    await store.deleteWorkout(drop.id)

    expect(await store.getLastUsedWorkoutId()).toBeNull()
    // and the Home screen still has something to select
    expect((await store.getLastUsedWorkout())?.id).toBe(keep.id)
  })

  it('leaves the last-used pointer alone when a different workout is deleted', async () => {
    const keep = await store.saveWorkout(aWorkout({ name: 'Keep' }))
    const drop = await store.saveWorkout(aWorkout({ name: 'Drop' }))
    await store.setLastUsedWorkoutId(keep.id)

    await store.deleteWorkout(drop.id)

    expect(await store.getLastUsedWorkoutId()).toBe(keep.id)
  })

  it('falls back to the first workout when the last-used id is stale', async () => {
    const first = await store.saveWorkout(aWorkout({ name: 'First' }))
    await store.setLastUsedWorkoutId('deleted-elsewhere')
    expect((await store.getLastUsedWorkout())?.id).toBe(first.id)
  })
})

describe('seeding', () => {
  it('seeds Core 15 on a first run and points last-used at it', async () => {
    const store = new WorkoutStore(new MemoryKeyValueStore())

    const seeded = await store.seedIfEmpty()

    expect(seeded?.name).toBe(SEED_WORKOUT_NAME)
    expect(seeded?.exercises).toHaveLength(5)
    expect(seeded?.workSeconds).toBe(45)
    expect(seeded?.restSeconds).toBe(15)
    expect(seeded?.loops).toBe(3)
    expect(seeded?.loopEnabled).toBe(true)
    expect(seeded?.restBetweenLoopsSeconds).toBe(0)
    expect(await store.getLastUsedWorkoutId()).toBe(seeded?.id)
  })

  it('does not seed twice, and never overwrites existing workouts', async () => {
    const store = new WorkoutStore(new MemoryKeyValueStore())
    await store.saveWorkout(aWorkout({ name: 'Mine' }))

    expect(await store.seedIfEmpty()).toBeNull()
    expect((await store.listWorkouts()).map((w) => w.name)).toEqual(['Mine'])
  })

  it('the seed workout is itself valid', async () => {
    const store = new WorkoutStore(new MemoryKeyValueStore())
    await expect(store.saveWorkout(createSeedWorkout())).resolves.toBeTruthy()
  })
})

describe('persistence across a reload', () => {
  it('reads back what a previous instance wrote to the same storage', async () => {
    const shared = new MemoryKeyValueStore()
    const first = new WorkoutStore(shared)
    const saved = await first.saveWorkout(aWorkout({ name: 'Survives' }))
    await first.setLastUsedWorkoutId(saved.id)

    const second = new WorkoutStore(shared)

    expect((await second.listWorkouts()).map((w) => w.name)).toEqual(['Survives'])
    expect(await second.getLastUsedWorkoutId()).toBe(saved.id)
  })

  it('survives a corrupt payload rather than throwing', async () => {
    const shared = new MemoryKeyValueStore()
    await shared.set('gymtime.workouts', 'not json at all')
    const store = new WorkoutStore(shared)

    expect(await store.listWorkouts()).toEqual([])
    await expect(store.saveWorkout(aWorkout())).resolves.toBeTruthy()
  })

  it('drops entries that are not workouts', async () => {
    const shared = new MemoryKeyValueStore()
    await shared.set('gymtime.workouts', JSON.stringify([{ nope: true }, null, 7]))
    const store = new WorkoutStore(shared)

    expect(await store.listWorkouts()).toEqual([])
  })
})
