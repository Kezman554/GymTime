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
- Running **Android 13 / API 33** — confirmed on the handset 13 Oct 2026. Build targets `minSdk 24` / `targetSdk 36`, so the sideloaded APK installs regardless. *(The vault had recorded API 30 / Android 11 since DailySync's PRD; that figure was stale and is now corrected in `5-reference/hardware-and-software.md`, which is the single source for it.)*
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

## Design

The UI has a settled visual language. Tokens live in `src/index.css` as CSS
custom properties — read the values there, not here.

**Typeface:** Archivo only, bundled via `@fontsource/archivo` at weights 400,
500 and 700. No remote font requests: the app must render correctly with no
network. There is no second typeface — weight, size and letter-spacing carry
all the differentiation.

**Modes:** light and dark are modes of each other, selected by `data-theme` on
the document element. Neither is a variant of the other; both are complete.

**Accent:** user-chosen from six named accents, selected by `data-accent`.
Each accent is defined **twice** — one value for the light ground, one for the
dark — because a single value cannot clear 4.5:1 on both. When adding or
changing an accent, both values are required and both must be measured.

**Danger is a separate token, never the accent.** A user can select Red as
their accent, so red alone cannot mean "destructive". Destructive actions are
signalled by their wording and by treatment — a question, a rule, an outline —
with colour only reinforcing. Never let red be the sole signal.

**Geometry:**
- Corner radius is 0 everywhere, including progress bars and buttons, with
  two exceptions: circular icon-only buttons are allowed, and the large
  in-workout action buttons (Home's Start and the timer screen's action row)
  are pill-shaped. Every other control stays square.
- Borders are 1px.
- Lists and groups are separated by hairline rules. **No cards** — no raised
  surfaces, no tinted panels standing in for structure. The card stack is the
  look this design replaced.
- Text inputs are bottom-ruled: a 1px bottom border and nothing else.
- Touch targets are at least 44px.

**The dial is the app's signature.** The timer and the workout rows both use a
drawn instrument dial rather than a bar. Geometry is in the components; the
rule is that progress is circular and mechanical, with a needle and a bezel,
not a linear bar.

**Icons** are inline stroke SVG, marked `aria-hidden`, with the accessible
label on the button. Never emoji, never glyph characters like ▲ ▼ ✕.

**No Tailwind, and no Tailwind-derived defaults.** Specifically: not the zinc
ramp, not `green-500`, not a 14px radius. If a colour is needed that no token
covers, add a token for it in both modes rather than writing a literal.
