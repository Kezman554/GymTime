import { useMemo } from 'react'
import { ACCENTS, THEMES, type Accent, type Settings, type Theme } from '../storage'
import { MARK_STEPS, ROW_STEPS, specLineTable } from '../trial'

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
  // TEMPORARY trial: read from the live tokens. It covers all six accents, so
  // only the mode matters; applyAppearance has already set it on <html>.
  const table = useMemo(() => specLineTable(settings.theme), [settings.theme])
  const marks = MARK_STEPS[settings.theme]

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

      {/* TEMPORARY: mark/row trial. Remove the section, src/trial.ts and the trial settings once baked. */}
      <section className="settings__section" aria-labelledby="settings-trial">
        <h2 id="settings-trial" className="section-label">
          Mark and rows — temporary trial
        </h2>
        <p className="settings__note">Both modes. Steps are this mode's values.</p>

        <h3 id="trial-mark" className="trial__label">Mark opacity</h3>
        <div className="segmented" role="radiogroup" aria-labelledby="trial-mark">
          {marks.map((value, index) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={settings.trialMark === index}
              className={`btn segmented__option trial__option${settings.trialMark === index ? ' is-selected' : ''}`}
              onClick={() => onChange({ trialMark: index })}
            >
              {value.toFixed(2)}
            </button>
          ))}
        </div>

        <h3 id="trial-row" className="trial__label">Unselected rows</h3>
        <div className="segmented" role="radiogroup" aria-labelledby="trial-row">
          {ROW_STEPS.map((value, index) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={settings.trialRow === index}
              className={`btn segmented__option trial__option${settings.trialRow === index ? ' is-selected' : ''}`}
              onClick={() => onChange({ trialRow: index })}
            >
              {Math.round(value * 100)}%
            </button>
          ))}
        </div>

        <table className="trial__table">
          <caption className="trial__caption">
            Spec line, worst case over the mark&apos;s densest stroke, all six accents. Below 4.5:1 is not
            shippable.
          </caption>
          <thead>
            <tr>
              <th scope="col">Mark</th>
              {ROW_STEPS.map((row) => (
                <th key={row} scope="col">
                  {Math.round(row * 100)}%
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.map((cells, m) => (
              <tr key={m}>
                <th scope="row">{marks[m].toFixed(2)}</th>
                {cells.map((ratio, r) => (
                  <td
                    key={r}
                    className={`${ratio < 4.5 ? 'trial__fail' : ''}${
                      settings.trialMark === m && settings.trialRow === r ? ' trial__current' : ''
                    }`}
                  >
                    {ratio.toFixed(2)}
                    {ratio < 4.5 && <span className="trial__verdict"> not shippable</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="settings__footer">
        <button type="button" className="btn btn--large btn--wide btn--primary" onClick={onDone}>
          Done
        </button>
      </div>
    </main>
  )
}
