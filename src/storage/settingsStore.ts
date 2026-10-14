import { createDefaultStore, type KeyValueStore } from './keyValueStore'
import { ACCENTS, THEMES, type Accent, type Theme } from './types'

/** index.html reads this key directly to set the theme before first paint. */
export const SETTINGS_KEY = 'gymtime.settings'

export interface Settings {
  speech: boolean
  beeps: boolean
  theme: Theme
  accent: Accent
  /** TEMPORARY: mark/row trial step indexes (see src/trial.ts). */
  trialMark: number
  trialRow: number
}

export const DEFAULT_SETTINGS: Settings = { speech: true, beeps: true, theme: 'dark', accent: 'orange', trialMark: 0, trialRow: 0 }

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
      theme: THEMES.includes(candidate.theme as Theme) ? (candidate.theme as Theme) : DEFAULT_SETTINGS.theme,
      accent: ACCENTS.includes(candidate.accent as Accent) ? (candidate.accent as Accent) : DEFAULT_SETTINGS.accent,
      trialMark: step(candidate.trialMark, 3),
      trialRow: step(candidate.trialRow, 2),
    }
  }

  async save(settings: Settings): Promise<void> {
    await this.store.set(SETTINGS_KEY, JSON.stringify(settings))
  }
}

/** TEMPORARY: a whole-number trial step from 0 to max, else 0. */
function step(value: unknown, max: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max ? value : 0
}
