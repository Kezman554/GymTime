/**
 * The seam between the app and the device.
 *
 * Deliberately async even though localStorage is synchronous: the intended
 * replacement, @capacitor/preferences, is Promise-based. A synchronous
 * interface here would make that swap a rewrite of every caller rather than
 * one new implementation.
 */
export interface KeyValueStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
}

/** Backed by the browser's localStorage, or any Storage-shaped object. */
export class WebKeyValueStore implements KeyValueStore {
  private readonly storage: Storage

  constructor(storage: Storage = globalThis.localStorage) {
    if (!storage) {
      throw new Error('WebKeyValueStore: no Storage available')
    }
    this.storage = storage
  }

  async get(key: string): Promise<string | null> {
    return this.storage.getItem(key)
  }

  async set(key: string, value: string): Promise<void> {
    this.storage.setItem(key, value)
  }

  async remove(key: string): Promise<void> {
    this.storage.removeItem(key)
  }
}

/** For tests, and for the fallback when device storage is unavailable. */
export class MemoryKeyValueStore implements KeyValueStore {
  private readonly values = new Map<string, string>()

  async get(key: string): Promise<string | null> {
    return this.values.has(key) ? (this.values.get(key) as string) : null
  }

  async set(key: string, value: string): Promise<void> {
    this.values.set(key, value)
  }

  async remove(key: string): Promise<void> {
    this.values.delete(key)
  }
}

/**
 * localStorage throws rather than returning null in a few real situations
 * (disabled site data, private mode on some WebViews), so the app falls back
 * to memory instead of failing to start.
 */
export function createDefaultStore(): KeyValueStore {
  try {
    const probe = '__gymtime_probe__'
    globalThis.localStorage.setItem(probe, '1')
    globalThis.localStorage.removeItem(probe)
    return new WebKeyValueStore()
  } catch {
    return new MemoryKeyValueStore()
  }
}
