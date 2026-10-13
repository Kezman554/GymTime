import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { WorkoutStore, type NewWorkout, type Workout } from './storage'
import { HomeScreen } from './components/HomeScreen'
import { EditorScreen } from './components/EditorScreen'
import { DEFAULT_WORKOUT } from './components/draft'

const store = new WorkoutStore()

// StrictMode runs effects twice in development; two concurrent seedIfEmpty
// calls would both see an empty library and seed it twice.
let seeding: Promise<unknown> | null = null
const seedOnce = () => (seeding ??= store.seedIfEmpty())

type Screen =
  | { kind: 'home' }
  | { kind: 'editor'; initial: NewWorkout | Workout }
  | { kind: 'started'; workout: Workout }

function App() {
  const [screen, setScreen] = useState<Screen>({ kind: 'home' })
  const [workouts, setWorkouts] = useState<Workout[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const list = await store.listWorkouts()
    setWorkouts(list)
    return list
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await seedOnce()
      const [, lastUsed] = await Promise.all([refresh(), store.getLastUsedWorkout()])
      if (!cancelled) setSelectedId(lastUsed?.id ?? null)
    })()
    return () => {
      cancelled = true
    }
  }, [refresh])

  // Screens other than Home sit on a history entry, so the Android back button
  // (see native/backButton) and the browser's back both return to Home.
  useEffect(() => {
    const onPopState = () => setScreen({ kind: 'home' })
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const open = (next: Screen) => {
    window.history.pushState({ screen: next.kind }, '')
    setScreen(next)
  }
  const backToHome = () => window.history.back()

  const select = (id: string) => {
    setSelectedId(id)
    void store.setLastUsedWorkoutId(id)
  }

  const save = async (workout: NewWorkout | Workout) => {
    const saved = await store.saveWorkout(workout)
    await refresh()
    select(saved.id)
    backToHome()
  }

  const remove = async (workout: Workout) => {
    await store.deleteWorkout(workout.id)
    const list = await refresh()
    const next = (await store.getLastUsedWorkout()) ?? list[0] ?? null
    setSelectedId(next?.id ?? null)
  }

  if (workouts === null) {
    return <main className="screen" aria-busy="true" />
  }

  switch (screen.kind) {
    case 'editor':
      return <EditorScreen initial={screen.initial} onSave={save} onCancel={backToHome} />
    case 'started':
      return (
        <main className="screen placeholder">
          <h1 className="screen__title">{screen.workout.name}</h1>
          <p className="empty">The timer arrives in a later session.</p>
          <button type="button" className="btn btn--large" onClick={backToHome}>
            Back
          </button>
        </main>
      )
    case 'home':
      return (
        <HomeScreen
          workouts={workouts}
          selectedId={selectedId}
          onSelect={select}
          onNew={() => open({ kind: 'editor', initial: { ...DEFAULT_WORKOUT } })}
          onEdit={(workout) => open({ kind: 'editor', initial: workout })}
          onDelete={(workout) => void remove(workout)}
          onStart={(workout) => {
            void store.setLastUsedWorkoutId(workout.id)
            open({ kind: 'started', workout })
          }}
        />
      )
  }
}

export default App
