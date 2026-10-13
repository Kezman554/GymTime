# GymTime - Product Requirements Document

Version: 0.1
Last Updated: 2026-10-13
GitHub: https://github.com/Kezman554/GymTime

## Overview

### Problem Statement
The full GymSync app (3D avatar, TV casting) is stalled at 29% and a long way from MVP. A simple tool is needed now to run interval workouts at home, such as a 15-minute core circuit, without watching a clock or remembering the exercise order.

### Goals
- A native Android app that runs a spoken interval workout from start to finish, hands-free
- Workouts are quick to set up and edit: exercise names, count, work time, rest time, loops
- Usable at home within a few sessions of build time
- Kept separate from GymSync as an interim tool

### Target Users
Nick, on his own Android phone, during home workouts.

## Features

### Workout Editor
- Add, remove, rename and reorder exercises
- Set work time and rest time (shared defaults: 45s work, 15s rest)
- Set loop count (default 3) or turn looping off
- Optional rest between loops (default off)
- Save multiple named workouts (e.g. "Core 15", "Legs") and pick one to run

### Timer
- 5-second lead-in countdown before the first exercise
- Large countdown clock for each work and rest period
- Clear display of current exercise, next exercise, and loop progress (e.g. "Loop 2 of 3")
- Final rest skipped at the very end of the workout
- Pause, resume and stop controls
- Timing based on real timestamps so it does not drift

### Audio Cues
- Speaks the exercise name at the start of the lead-in and each work period
- Speaks "Rest. Next up: {exercise}" at the start of each rest period
- 3-2-1 beeps before each switch
- Speaks "Workout complete" at the end

### Device Behaviour
- Screen stays on while a workout is running
- Works fully offline

## Scope

### In Scope
- Android app built with Capacitor and installed directly from an APK
- Local storage of workouts on the device

### Out of Scope
- Images, avatar or video
- Rep counting
- TV casting
- Accounts, backend or cloud sync
- iOS build
- Play Store publishing

### Future Considerations
- Per-exercise custom work/rest times
- Workout history log
- Folding features back into GymSync

## Technical

### Stack
- Vite + React + TypeScript: UI and app logic
- Capacitor (Android): native wrapper producing the APK
- @capacitor-community/text-to-speech: native spoken cues
- @capacitor-community/keep-awake: keeps the screen on during workouts
- Web Audio API: countdown beeps
- localStorage (or @capacitor/preferences): saved workouts
- Vitest: unit tests for the timer engine

### Integrations
- None. No external APIs or network access required.

### Target Device
- **Samsung Galaxy A32 5G** — the one device this has to work on. The vault records it at **API 30 (Android 11)** as DailySync's test device; it may have taken an OS update since, so confirm the live version before setting `minSdk`. Capacitor's floor is well below API 30 either way.
- Portrait only. Sideloaded APK — no Play Store, same install route DailySync uses.
- Samsung's TTS engine may not ship an en-GB voice, and Samsung's battery optimisation is aggressive about backgrounded apps. Both are addressed in sessions H and J.

### Constraints
- Must work offline
- Timer must stay accurate over a 15+ minute session
- Speech must not delay or desync the clock
- Built and installed from a Windows PC (`C:\Dev\GymTime`) with Android Studio. `JAVA_HOME` already points at Android Studio's bundled JBR (OpenJDK 21) and is on PATH, set up for DailySync in July 2026 — `gradlew` works from any terminal, so no JDK setup is needed.

## Project Structure

```
GymTime/
├── docs/
│   ├── gymtime_PRD.md
│   └── progress.txt
├── CLAUDE.md
├── src/
│   ├── components/   (editor, timer screen)
│   ├── engine/       (timer state machine)
│   ├── audio/        (speech + beeps)
│   ├── storage/      (saved workouts)
│   └── App.tsx
├── tests/
├── android/          (Capacitor-generated)
├── capacitor.config.ts
└── package.json
```

The GitHub repo already exists and is **public**, so nothing personal goes in the code — exercise names are fine, anything else is not.

## Success Criteria

- [ ] APK installs on the A32 and launches from the app icon
- [ ] A 5 × 45s/15s × 3-loop workout runs start to finish with correct spoken cues
- [ ] Clock is within 1 second of real time after 15 minutes
- [ ] Screen stays on for the whole workout
- [ ] Workouts can be created, edited, saved and reloaded after closing the app
- [ ] Works with the phone in airplane mode
