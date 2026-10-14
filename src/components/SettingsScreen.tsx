import { ACCENTS, THEMES, type Accent, type Settings, type Theme } from '../storage'

interface SettingsScreenProps {
  settings: Settings
  /** Only the fields that changed; the rest are kept. */
  onChange: (change: Partial<Settings>) => void
  onDone: () => void
}

const THEME_LABEL: Record<Theme, string> = { light: 'Light', dark: 'Dark' }

const ACCENT_LABEL: Record<Accent, string> = {
  red: 'Red',
  orange: 'Orange',
  sky: 'Sky',
  green: 'Green',
  brass: 'Brass',
  mono: 'Mono',
}

const SOUND_OPTIONS: { key: 'speech' | 'beeps'; label: string }[] = [
  { key: 'speech', label: 'Speech' },
  { key: 'beeps', label: 'Beeps' },
]

export function SettingsScreen({ settings, onChange, onDone }: SettingsScreenProps) {
  return (
    <main className="screen settings">
      <header className="screen__header">
        <h1 className="screen__title">Settings</h1>
      </header>

      <section className="settings__section" aria-labelledby="settings-appearance">
        <h2 id="settings-appearance" className="section-label">
          Appearance
        </h2>
        <div className="segmented" role="radiogroup" aria-labelledby="settings-appearance">
          {THEMES.map((theme) => (
            <button
              key={theme}
              type="button"
              role="radio"
              aria-checked={settings.theme === theme}
              className={`btn segmented__option${settings.theme === theme ? ' is-selected' : ''}`}
              onClick={() => onChange({ theme })}
            >
              {THEME_LABEL[theme]}
            </button>
          ))}
        </div>
      </section>

      <section className="settings__section" aria-labelledby="settings-accent">
        <h2 id="settings-accent" className="section-label">
          Accent
        </h2>
        <div className="swatches" role="radiogroup" aria-labelledby="settings-accent">
          {ACCENTS.map((accent) => (
            <div key={accent} className="swatches__item">
              {/* The fill reads this mode's --accent-<key> token, so it follows Light/Dark. */}
              <button
                type="button"
                role="radio"
                aria-checked={settings.accent === accent}
                aria-label={ACCENT_LABEL[accent]}
                className={`swatch${settings.accent === accent ? ' is-selected' : ''}`}
                style={{ backgroundColor: `var(--accent-${accent})` }}
                onClick={() => onChange({ accent })}
              />
              <span className="swatches__name" aria-hidden="true">
                {ACCENT_LABEL[accent]}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="settings__section" aria-labelledby="settings-sound">
        <h2 id="settings-sound" className="section-label">
          Sound
        </h2>
        <ul className="setting-rows">
          {SOUND_OPTIONS.map(({ key, label }) => (
            <li key={key} className="setting-row">
              <span id={`settings-${key}`} className="setting-row__label">
                {label}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={settings[key]}
                aria-labelledby={`settings-${key}`}
                className={`toggle${settings[key] ? ' toggle--on' : ''}`}
                onClick={() => onChange({ [key]: !settings[key] })}
              >
                {settings[key] ? 'On' : 'Off'}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="settings__footer">
        <button type="button" className="btn btn--large btn--wide btn--primary" onClick={onDone}>
          Done
        </button>
      </div>
    </main>
  )
}
