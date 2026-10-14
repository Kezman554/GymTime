import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import {
  DEFAULT_SETTINGS,
  SettingsStore,
  WorkoutStore,
  type NewWorkout,
  type Settings,
  type Workout,
} from './storage'
import { HomeScreen } from './components/HomeScreen'
import { EditorScreen } from './components/EditorScreen'
import { TimerScreen } from './components/TimerScreen'
import { SettingsScreen } from './components/SettingsScreen'
import { DEFAULT_WORKOUT } from './components/draft'
import { getBeeps } from './audio/beeps'
import { applyAppearance } from './appearance'

const store = new WorkoutStore()
const settingsStore = new SettingsStore()

// StrictMode runs effects twice in development; two concurrent seedIfEmpty
// calls would both see an empty library and seed it twice.
let seeding: Promise<unknown> | null = null
const seedOnce = () => (seeding ??= store.seedIfEmpty())

type Screen =
  | { kind: 'home' }
  | { kind: 'editor'; initial: NewWorkout | Workout }
  | { kind: 'timer'; workout: Workout }
  | { kind: 'settings' }

function App() {
  const [screen, setScreen] = useState<Screen>({ kind: 'home' })
  const [workouts, setWorkouts] = useState<Workout[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  // Changes merge onto the latest settings, not the last render's, so two
  // quick changes never undo each other.
  const settingsRef = useRef(settings)

  const refresh = useCallback(async () => {
    const list = await store.listWorkouts()
    setWorkouts(list)
    return list
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await seedOnce()
      const [, lastUsed, savedSettings] = await Promise.all([
        refresh(),
        store.getLastUsedWorkout(),
        settingsStore.load(),
      ])
      if (cancelled) return
      setSelectedId(lastUsed?.id ?? null)
      settingsRef.current = savedSettings
      setSettings(savedSettings)
      applyAppearance(savedSettings)
    })()
    return () => {
      cancelled = true
    }
  }, [refresh])

  // A screen can claim the back button (the timer asks before stopping).
  const backInterceptor = useRef<(() => boolean) | null>(null)
  const setBackInterceptor = useCallback((intercept: (() => boolean) | null) => {
    backInterceptor.current = intercept
  }, [])

  // Screens other than Home sit on a history entry, so the Android back button
  // (see native/backButton) and the browser's back both return to Home.
  useEffect(() => {
    const onPopState = () => {
      if (backInterceptor.current?.()) {
        // Put back the entry the back press consumed, and stay on this screen.
        window.history.pushState({ screen: 'intercepted' }, '')
        return
      }
      setScreen({ kind: 'home' })
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const open = (next: Screen) => {
    window.history.pushState({ screen: next.kind }, '')
    setScreen(next)
  }
  // The app's own way home is never intercepted.
  const backToHome = () => {
    backInterceptor.current = null
    window.history.back()
  }

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

  const changeSettings = (change: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...change }
    settingsRef.current = next
    setSettings(next)
    applyAppearance(next)
    void settingsStore.save(next)
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
      return (
        <EditorScreen
          initial={screen.initial}
          onSave={save}
          onCancel={backToHome}
          onDelete={(workout) => {
            void remove(workout)
            backToHome()
          }}
          setBackInterceptor={setBackInterceptor}
        />
      )
    case 'settings':
      return <SettingsScreen settings={settings} onChange={changeSettings} onDone={backToHome} />
    case 'timer':
      return (
        <TimerScreen
          workout={screen.workout}
          settings={settings}
          onDone={backToHome}
          setBackInterceptor={setBackInterceptor}
        />
      )
    case 'home':
      return (
        <HomeScreen
          workouts={workouts}
          selectedId={selectedId}
          onSelect={select}
          onNew={() => open({ kind: 'editor', initial: { ...DEFAULT_WORKOUT } })}
          onEdit={(workout) => open({ kind: 'editor', initial: workout })}
          onOpenSettings={() => open({ kind: 'settings' })}
          onStart={(workout) => {
            // Inside the tap, so the browser/WebView lets audio start.
            getBeeps().unlock()
            void store.setLastUsedWorkoutId(workout.id)
            open({ kind: 'timer', workout })
          }}
        />
      )
  }
}

export default App
