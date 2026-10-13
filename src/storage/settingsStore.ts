import { createDefaultStore, type KeyValueStore } from './keyValueStore'

const SETTINGS_KEY = 'gymtime.settings'

export interface Settings {
  speech: boolean
  beeps: boolean
}

export const DEFAULT_SETTINGS: Settings = { speech: true, beeps: true }

export class SettingsStore {
  private readonly store: KeyValueStore

  constructor(store: KeyValueStore = createDefaultStore()) {
    this.store = store
  }

  /** Missing, corrupt or partial data falls back to the defaults field by field. */
  async load(): Promise<Settings> {
    const raw = await this.store.get(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return { ...DEFAULT_SETTINGS }
    }
    const candidate = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as Partial<Settings>
    return {
      speech: typeof candidate.speech === 'boolean' ? candidate.speech : DEFAULT_SETTINGS.speech,
      beeps: typeof candidate.beeps === 'boolean' ? candidate.beeps : DEFAULT_SETTINGS.beeps,
    }
  }

  async save(settings: Settings): Promise<void> {
    await this.store.set(SETTINGS_KEY, JSON.stringify(settings))
  }
}
