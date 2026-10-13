# Project: GymTime

A spoken interval timer for home workouts that announces exercises and counts down work and rest periods.
Built with Vite + React + TypeScript, wrapped as a native Android app with Capacitor.

## Structure
- src/components/ - Workout editor and timer screen UI
- src/engine/ - Timer state machine (pure logic, no UI)
- src/audio/ - Text-to-speech cues and beeps
- src/storage/ - Saved workouts
- android/ - Capacitor-generated Android project
- docs/ - PRD and progress log

## Commands
- `npm run dev` - Run in the browser for quick UI checks
- `npm run test` - Run Vitest unit tests
- `npm run android:sync` - Build web assets and copy them into the Android project
- `npm run android:apk` - Sync, then build the debug APK (android/app/build/outputs/apk/debug/)

Use the npm scripts, not `cd android && gradlew ...` — the shell here is PowerShell, which has no `&&`.

## Device
- Target is a **Samsung Galaxy A32 5G**, portrait only, APK sideloaded — no Play Store.
- The vault records it at API 30 (Android 11); confirm the live version before setting `minSdk`.
- `JAVA_HOME` already points at Android Studio's bundled JBR (OpenJDK 21) and is on PATH, so `gradlew` works from any terminal. No JDK setup needed.
- Samsung's TTS engine may lack an en-GB voice, and Samsung battery optimisation is aggressive about backgrounded apps. Degrade gracefully rather than assuming either.

## Git
- The GitHub repo is **public** — no personal data in the code
- Do not push to GitHub without explicit permission
- Commit after completing each session
- Update docs/progress.txt briefly if significant work was done

## Conventions
- Timer engine is pure TypeScript with no React or Capacitor imports, so it can be unit tested
- Countdown uses real timestamps (Date.now / performance.now), never decrement-per-tick
- Native features (speech, keep-awake) go through small wrappers in src/audio/ and src/ so the app still runs in the browser with fallbacks
- Large, high-contrast, glanceable UI. Readable from a few metres away

## Reference
- Requirements: docs/gymtime_PRD.md
- Progress log: docs/progress.txt
- Task prompts: Kanban app
