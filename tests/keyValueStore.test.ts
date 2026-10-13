import { describe, expect, it } from 'vitest'
import {
  MemoryKeyValueStore,
  WebKeyValueStore,
  WorkoutStore,
  createDefaultStore,
} from '../src/storage'

/** A stand-in for localStorage: same shape, no browser needed. */
function fakeStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key: string) => (map.has(key) ? (map.get(key) as string) : null),
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => void map.set(key, value),
  } as Storage
}

describe('WebKeyValueStore', () => {
  it('reads, writes and removes through the Storage it was given', async () => {
    const store = new WebKeyValueStore(fakeStorage())

    expect(await store.get('missing')).toBeNull()
    await store.set('a', '1')
    expect(await store.get('a')).toBe('1')
    await store.remove('a')
    expect(await store.get('a')).toBeNull()
  })

  it('refuses to construct with no Storage at all', () => {
    expect(() => new WebKeyValueStore(undefined as unknown as Storage)).toThrow()
  })

  it('carries a full workout round trip, which is the production path', async () => {
    const backing = fakeStorage()
    const store = new WorkoutStore(new WebKeyValueStore(backing))

    const seeded = await store.seedIfEmpty()
    expect(seeded?.name).toBe('Core 15')

    // a second store over the same Storage is what a reload looks like
    const reloaded = new WorkoutStore(new WebKeyValueStore(backing))
    expect((await reloaded.listWorkouts()).map((w) => w.name)).toEqual(['Core 15'])
    expect(await reloaded.getLastUsedWorkoutId()).toBe(seeded?.id)
  })
})

describe('createDefaultStore', () => {
  it('falls back to memory when localStorage throws', () => {
    const original = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('site data blocked')
      },
    })

    try {
      expect(createDefaultStore()).toBeInstanceOf(MemoryKeyValueStore)
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: original,
        writable: true,
      })
    }
  })

  it('uses localStorage when it works', () => {
    const original = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: fakeStorage(),
      writable: true,
    })

    try {
      expect(createDefaultStore()).toBeInstanceOf(WebKeyValueStore)
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: original,
        writable: true,
      })
    }
  })
})
