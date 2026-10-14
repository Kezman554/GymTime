import { useMemo, useState } from 'react'
import { createId, validateWorkout, type NewWorkout, type Workout } from '../storage'
import { formatDuration, workoutDurationSeconds } from '../engine/duration'
import { fromDraft, moveItem, toDraft, type WorkoutDraft } from './draft'
import { NumberStepper } from './NumberStepper'
import { ChevronDownIcon, ChevronUpIcon, CrossIcon, PlusIcon } from './icons'

type Field = 'name' | 'exercises' | 'work' | 'rest' | 'loops' | 'betweenLoops'

/** validateWorkout speaks in sentences; this ties each one back to its field. */
function fieldFor(issue: string): Field {
  if (issue.startsWith('name')) return 'name'
  if (issue.includes('exercise')) return 'exercises'
  if (issue.startsWith('work')) return 'work'
  if (issue.startsWith('rest between')) return 'betweenLoops'
  if (issue.startsWith('rest')) return 'rest'
  return 'loops'
}

function sentence(issue: string): string {
  return issue.charAt(0).toUpperCase() + issue.slice(1) + '.'
}

const MAX_SECONDS = 3600
const MAX_LOOPS = 99

interface EditorScreenProps {
  initial: NewWorkout | Workout
  onSave: (workout: NewWorkout | Workout) => Promise<void>
  onCancel: () => void
}

export function EditorScreen({ initial, onSave, onCancel }: EditorScreenProps) {
  const [draft, setDraft] = useState<WorkoutDraft>(() => toDraft(initial))
  const [touched, setTouched] = useState<Set<Field>>(() => new Set())
  const [attempted, setAttempted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const candidate = useMemo(() => fromDraft(draft), [draft])
  const issues = useMemo(() => validateWorkout(candidate), [candidate])
  // A field's problems show once it has been edited, or all of them after a Save attempt.
  const visibleIssues = issues.filter((issue) => attempted || touched.has(fieldFor(issue)))
  const invalid = (field: Field) => visibleIssues.some((issue) => fieldFor(issue) === field)

  // Exercise names do not affect the total, so only the numbers have to be valid.
  const timingValid = issues.every((issue) => ['name', 'exercises'].includes(fieldFor(issue)))
  const total = timingValid
    ? formatDuration(
        workoutDurationSeconds({ ...candidate, exerciseCount: candidate.exercises.length }),
      )
    : '—'

  const update = (field: Field, patch: Partial<WorkoutDraft>) => {
    setDraft((previous) => ({ ...previous, ...patch }))
    setTouched((previous) => (previous.has(field) ? previous : new Set(previous).add(field)))
  }

  const setExercises = (exercises: WorkoutDraft['exercises']) => update('exercises', { exercises })

  const addExercise = () =>
    setExercises([
      ...draft.exercises,
      { key: createId(), name: `Exercise ${draft.exercises.length + 1}` },
    ])

  const save = async () => {
    setAttempted(true)
    if (issues.length > 0) return
    setSaving(true)
    setSaveError(null)
    try {
      await onSave(candidate)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save the workout.')
      setSaving(false)
    }
  }

  const loopsOff = !draft.loopEnabled

  return (
    <main className="screen editor">
      <header className="screen__header">
        <h1 className="screen__title">{draft.id ? 'Edit workout' : 'New workout'}</h1>
      </header>

      <section className="field">
        <label className="field__label" htmlFor="workout-name">
          Name
        </label>
        <input
          id="workout-name"
          className={`text-input${invalid('name') ? ' is-invalid' : ''}`}
          type="text"
          value={draft.name}
          placeholder="e.g. Core 15"
          autoComplete="off"
          onChange={(event) => update('name', { name: event.target.value })}
          aria-invalid={invalid('name')}
        />
      </section>

      <section className="field">
        <h2 className="field__label">Exercises ({draft.exercises.length})</h2>
        <ol className="exercise-list">
          {draft.exercises.map((exercise, index) => {
            const label = exercise.name.trim() || `exercise ${index + 1}`
            const blank = invalid('exercises') && exercise.name.trim() === ''
            return (
              <li key={exercise.key} className="exercise-row">
                <span className="exercise-row__number">{index + 1}</span>
                <input
                  className={`text-input exercise-row__name${blank ? ' is-invalid' : ''}`}
                  type="text"
                  value={exercise.name}
                  aria-label={`Exercise ${index + 1} name`}
                  aria-invalid={blank}
                  autoComplete="off"
                  onChange={(event) =>
                    setExercises(
                      draft.exercises.map((item) =>
                        item.key === exercise.key ? { ...item, name: event.target.value } : item,
                      ),
                    )
                  }
                />
                <div className="exercise-row__actions">
                  <button
                    type="button"
                    className="btn exercise-row__btn"
                    aria-label={`Move ${label} up`}
                    disabled={index === 0}
                    onClick={() => setExercises(moveItem(draft.exercises, index, index - 1))}
                  >
                    <ChevronUpIcon />
                  </button>
                  <button
                    type="button"
                    className="btn exercise-row__btn"
                    aria-label={`Move ${label} down`}
                    disabled={index === draft.exercises.length - 1}
                    onClick={() => setExercises(moveItem(draft.exercises, index, index + 1))}
                  >
                    <ChevronDownIcon />
                  </button>
                  <button
                    type="button"
                    className="btn exercise-row__btn exercise-row__btn--remove"
                    aria-label={`Remove ${label}`}
                    disabled={draft.exercises.length === 1}
                    onClick={() =>
                      setExercises(draft.exercises.filter((item) => item.key !== exercise.key))
                    }
                  >
                    <CrossIcon />
                  </button>
                </div>
              </li>
            )
          })}
        </ol>
        <button type="button" className="btn btn--wide add-exercise" onClick={addExercise}>
          <PlusIcon />
          Add exercise
        </button>
      </section>

      <section className="field steppers">
        <div className="stepper-pair">
          <NumberStepper
            id="work-seconds"
            label="Work"
            unit="s"
            value={draft.workSeconds}
            onChange={(workSeconds) => update('work', { workSeconds })}
            step={5}
            min={5}
            max={MAX_SECONDS}
            invalid={invalid('work')}
          />
          <NumberStepper
            id="rest-seconds"
            label="Rest"
            unit="s"
            value={draft.restSeconds}
            onChange={(restSeconds) => update('rest', { restSeconds })}
            step={5}
            min={5}
            max={MAX_SECONDS}
            invalid={invalid('rest')}
          />
        </div>

        <div className="toggle-row toggle-row--ruled">
          <span className="field__label" id="loop-toggle-label">
            Loop
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={draft.loopEnabled}
            aria-labelledby="loop-toggle-label"
            className={`toggle${draft.loopEnabled ? ' toggle--on' : ''}`}
            onClick={() => update('loops', { loopEnabled: !draft.loopEnabled })}
          >
            {draft.loopEnabled ? 'On' : 'Off'}
          </button>
        </div>

        <div className="stepper-pair">
          <NumberStepper
            id="loops"
            label="Loops"
            value={draft.loops}
            onChange={(loops) => update('loops', { loops })}
            step={1}
            min={1}
            max={MAX_LOOPS}
            disabled={loopsOff}
            invalid={invalid('loops')}
          />
          <NumberStepper
            id="rest-between-loops"
            label="Rest between loops"
            unit="s"
            zeroLabel="Off"
            value={draft.restBetweenLoopsSeconds}
            onChange={(restBetweenLoopsSeconds) =>
              update('betweenLoops', { restBetweenLoopsSeconds })
            }
            step={5}
            min={0}
            max={MAX_SECONDS}
            disabled={loopsOff}
            invalid={invalid('betweenLoops')}
          />
        </div>
      </section>

      <div className="editor__footer">
        <p className="total">
          <span className="total__label">Total</span>
          <span className="total__value">{total}</span>
        </p>

        {(visibleIssues.length > 0 || saveError) && (
          <ul className="issues" role="alert">
            {visibleIssues.map((issue) => (
              <li key={issue}>{sentence(issue)}</li>
            ))}
            {saveError && <li>{saveError}</li>}
          </ul>
        )}

        <div className="button-row">
          <button type="button" className="btn btn--large btn--outline" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--large btn--primary"
            onClick={save}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </main>
  )
}
