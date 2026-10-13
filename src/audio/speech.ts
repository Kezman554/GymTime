import { Capacitor } from '@capacitor/core'
import { QueueStrategy, TextToSpeech } from '@capacitor-community/text-to-speech'
import { chooseVoice, voiceTag, type VoiceInfo } from './cues'

/**
 * Spoken cues. Every call is fire-and-forget: nothing here is awaited by the
 * timer, and failures are logged, never thrown. A new cue flushes whatever is
 * still being said so speech can never fall behind the clock.
 *
 * Android uses @capacitor-community/text-to-speech (the WebView has no
 * speechSynthesis); the browser uses speechSynthesis directly.
 */
export interface Speech {
  say(text: string): void
  cancel(): void
}

const FALLBACK_LANG = 'en-GB'

function describe(voice: VoiceInfo | undefined): string {
  return voice
    ? `${voice.voiceURI ?? voice.name} (${voiceTag(voice)}${voice.localService ? ', on-device' : ', network'})`
    : `engine default for ${FALLBACK_LANG}`
}

function createNativeSpeech(): Speech {
  let voice: { index: number; lang: string } | null = null

  // Bind to the TTS engine early; until it answers, cues use the language alone.
  TextToSpeech.getSupportedVoices()
    .then(({ voices }) => {
      const index = chooseVoice(voices)
      // Pass a clean tag: setLanguage("eng-x-lvariant-f00") would lose the country.
      if (index !== null) voice = { index, lang: voiceTag(voices[index]) }
      console.info(
        `GymTime speech: ${describe(index === null ? undefined : voices[index])} of ${voices.length} voices`,
      )
    })
    .catch((error: unknown) => console.warn('GymTime speech: could not list voices', error))

  return {
    say(text) {
      TextToSpeech.speak({
        text,
        lang: voice?.lang ?? FALLBACK_LANG,
        voice: voice?.index,
        rate: 1,
        queueStrategy: QueueStrategy.Flush,
      }).catch((error: unknown) => console.warn('GymTime speech: speak failed', error))
    },
    cancel() {
      TextToSpeech.stop().catch((error: unknown) => console.warn('GymTime speech: stop failed', error))
    },
  }
}

function createBrowserSpeech(): Speech {
  const synth = globalThis.speechSynthesis
  if (!synth) {
    console.info('GymTime speech: speechSynthesis unavailable, cues will be silent')
    return { say() {}, cancel() {} }
  }

  let voice: SpeechSynthesisVoice | null = null
  let announced = false

  // Browsers fill the voice list asynchronously; pick again whenever it changes.
  const pick = () => {
    const voices = synth.getVoices()
    if (voices.length === 0) return
    const index = chooseVoice(voices)
    voice = index === null ? null : voices[index]
    if (!announced) {
      announced = true
      console.info(`GymTime speech: ${describe(voice ?? undefined)} of ${voices.length} voices`)
    }
  }
  pick()
  synth.addEventListener?.('voiceschanged', pick)

  return {
    say(text) {
      try {
        synth.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        if (voice) utterance.voice = voice
        utterance.lang = voice?.lang ?? FALLBACK_LANG
        synth.speak(utterance)
      } catch (error) {
        console.warn('GymTime speech: speak failed', error)
      }
    },
    cancel() {
      try {
        synth.cancel()
      } catch (error) {
        console.warn('GymTime speech: cancel failed', error)
      }
    },
  }
}

let instance: Speech | null = null

/** One shared instance, created on first use so the voice lookup starts early. */
export function getSpeech(): Speech {
  instance ??= Capacitor.isNativePlatform() ? createNativeSpeech() : createBrowserSpeech()
  return instance
}
