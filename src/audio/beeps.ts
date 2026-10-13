/**
 * Countdown beeps synthesised with the Web Audio API — no audio files.
 * 3 and 2 are short pips; 1 is higher and longer so the switch is obvious
 * without looking. Like speech, every call is fire-and-forget and failures
 * are logged, never thrown.
 */

export interface BeepSpec {
  frequency: number
  durationMs: number
}

export function beepSpec(secondsRemaining: 3 | 2 | 1): BeepSpec {
  return secondsRemaining === 1
    ? { frequency: 1320, durationMs: 450 }
    : { frequency: 880, durationMs: 120 }
}

/** Short fades at each end stop the speaker clicking. */
const RAMP_S = 0.01
const VOLUME = 0.6

export interface Beeps {
  /**
   * Must be called from a user gesture (the Start tap): browsers and the
   * WebView only let an AudioContext start playing after one.
   */
  unlock(): void
  beep(secondsRemaining: 3 | 2 | 1): void
}

type AudioContextCtor = typeof AudioContext

function createBeeps(): Beeps {
  const Ctor: AudioContextCtor | undefined =
    globalThis.AudioContext ??
    (globalThis as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
  let context: AudioContext | null = null

  const ensureRunning = (ctx: AudioContext) => {
    // Suspended until a gesture, and again after the app has been backgrounded.
    if (ctx.state !== 'running') {
      ctx.resume().catch((error: unknown) => console.warn('GymTime beeps: resume failed', error))
    }
  }

  return {
    unlock() {
      if (!Ctor) return
      try {
        context ??= new Ctor()
        ensureRunning(context)
      } catch (error) {
        console.warn('GymTime beeps: no audio context', error)
      }
    },
    beep(secondsRemaining) {
      if (!context) return
      try {
        ensureRunning(context)
        const { frequency, durationMs } = beepSpec(secondsRemaining)
        const start = context.currentTime
        const end = start + durationMs / 1000

        const oscillator = context.createOscillator()
        oscillator.type = 'sine'
        oscillator.frequency.value = frequency

        const gain = context.createGain()
        gain.gain.setValueAtTime(0, start)
        gain.gain.linearRampToValueAtTime(VOLUME, start + RAMP_S)
        gain.gain.setValueAtTime(VOLUME, end - RAMP_S)
        gain.gain.linearRampToValueAtTime(0, end)

        oscillator.connect(gain).connect(context.destination)
        oscillator.start(start)
        oscillator.stop(end)
        oscillator.onended = () => gain.disconnect()
      } catch (error) {
        console.warn('GymTime beeps: beep failed', error)
      }
    },
  }
}

let instance: Beeps | null = null

export function getBeeps(): Beeps {
  instance ??= createBeeps()
  return instance
}
