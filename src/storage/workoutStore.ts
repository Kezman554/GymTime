import {
  assertValidWorkout,
  type NewWorkout,
  type Workout,
} from './types'
import {
  createDefaultStore,
  type KeyValueStore,
} from './keyValueStore'

const WORKOUTS_KEY = 'gymtime.workouts'
const LAST_USED_KEY = 'gymtime.lastWorkoutId'

export const SEED_WORKOUT_NAME = 'Core 15'

/** The workout a fresh install starts with. Names are placeholders to rename. */
export function createSeedWorkout(): NewWorkout {
  return {
    name: SEED_WORKOUT_NAME,
    exercises: ['Exercise 1', 'Exercise 2', 'Exercise 3', 'Exercise 4', 'Exercise 5'],
    workSeconds: 45,
    restSeconds: 15,
    loops: 3,
    loopEnabled: true,
    restBetweenLoopsSeconds: 0,
  }
}

/**
 * crypto.randomUUID needs a secure context and a reasonably current WebView.
 * Capacitor serves from https://localhost so the context is fine, but the A32's
 * System WebView version is not something this app gets to choose.
 */
export function createId(): string {
  const cryptoObj = globalThis.crypto
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID()
  }
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const bytes = cryptoObj.getRandomValues(new Uint8Array(8))
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export class WorkoutStore {
  private readonly store: KeyValueStore

  constructor(store: KeyValueStore = createDefaultStore()) {
    this.store = store
  }

  /** All saved workouts, in the order they were saved. */
  async listWorkouts(): Promise<Workout[]> {
    const raw = await this.store.get(WORKOUTS_KEY)
    if (!raw) return []
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      // Corrupt payload: better an empty library than a screen that won't load.
      return []
    }
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isStoredWorkout)
  }

  async getWorkout(id: string): Promise<Workout | null> {
    const workouts = await this.listWorkouts()
    return workouts.find((workout) => workout.id === id) ?? null
  }

  /**
   * Creates when given a workout without an id, updates in place when the id
   * is already present, and appends when the id is new. Returns what was saved.
   */
  async saveWorkout(workout: NewWorkout | Workout): Promise<Workout> {
    assertValidWorkout(workout)
    const workouts = await this.listWorkouts()
    const id = 'id' in workout && workout.id ? workout.id : createId()
    const saved: Workout = { ...workout, id, name: workout.name.trim() }
    const index = workouts.findIndex((existing) => existing.id === id)
    if (index === -1) {
      workouts.push(saved)
    } else {
      workouts[index] = saved
    }
    await this.store.set(WORKOUTS_KEY, JSON.stringify(workouts))
    return saved
  }

  /** True when a workout was removed, false when the id was unknown. */
  async deleteWorkout(id: string): Promise<boolean> {
    const workouts = await this.listWorkouts()
    const remaining = workouts.filter((workout) => workout.id !== id)
    if (remaining.length === workouts.length) return false
    await this.store.set(WORKOUTS_KEY, JSON.stringify(remaining))
    if ((await this.getLastUsedWorkoutId()) === id) {
      await this.store.remove(LAST_USED_KEY)
    }
    return true
  }

  async getLastUsedWorkoutId(): Promise<string | null> {
    return this.store.get(LAST_USED_KEY)
  }

  async setLastUsedWorkoutId(id: string): Promise<void> {
    await this.store.set(LAST_USED_KEY, id)
  }

  /**
   * The workout the Home screen should select on open: the last used one if it
   * still exists, otherwise the first saved, otherwise null.
   */
  async getLastUsedWorkout(): Promise<Workout | null> {
    const id = await this.getLastUsedWorkoutId()
    if (id) {
      const workout = await this.getWorkout(id)
      if (workout) return workout
    }
    const workouts = await this.listWorkouts()
    return workouts[0] ?? null
  }

  /**
   * Writes the seed workout on a first run only. Returns the seeded workout, or
   * null when the library already had something in it.
   */
  async seedIfEmpty(): Promise<Workout | null> {
    const workouts = await this.listWorkouts()
    if (workouts.length > 0) return null
    const seeded = await this.saveWorkout(createSeedWorkout())
    await this.setLastUsedWorkoutId(seeded.id)
    return seeded
  }
}

function isStoredWorkout(value: unknown): value is Workout {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<Workout>
  return typeof candidate.id === 'string' && candidate.id !== '' && typeof candidate.name === 'string'
}
