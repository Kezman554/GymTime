import type { Segment } from '../engine/sequence'

/** What gets said when a segment starts. */
export function segmentCue(segment: Segment): string {
  switch (segment.type) {
    case 'leadIn':
      return `Get ready. ${segment.exerciseName}`
    case 'work':
      return segment.exerciseName
    case 'rest':
      return `Rest. Next up: ${segment.exerciseName}`
    case 'loopRest':
      // A loop rest belongs to the loop about to start, so the one just
      // finished is the one before it.
      return `Loop ${segment.loop - 1} complete. Rest. Next up: ${segment.exerciseName}`
  }
}

export const COMPLETE_CUE = 'Workout complete'

/** The fields both the browser and the native plugin report for a voice. */
export interface VoiceInfo {
  name: string
  lang: string
  localService: boolean
  voiceURI?: string
  default?: boolean
}

/** "en_GB", "EN-gb" and "en-GB" all become "en-gb"; ISO-639-2 "eng" becomes "en". */
function normaliseLang(lang: string): string {
  return lang.replace(/_/g, '-').toLowerCase().replace(/^eng(?=-|$)/, 'en')
}

/**
 * The most specific language tag a voice gives away. Samsung TTS reports
 * lang as "eng-x-lvariant-f00" or "eng-default" with the country lost, but
 * keeps it in the voice id: "en-GB-SMTf00".
 */
export function voiceTag(voice: VoiceInfo): string {
  const fromUri = voice.voiceURI?.match(/^([a-z]{2,3})[-_]([A-Za-z]{2})(?=[-_]|$)/i)
  if (fromUri) return `${normaliseLang(fromUri[1])}-${fromUri[2].toUpperCase()}`
  return voice.lang
}

/** Closer to British English ranks higher; non-English is 0 and never chosen. */
function langScore(lang: string): number {
  const tag = normaliseLang(lang)
  if (tag === 'en-gb' || tag.startsWith('en-gb-')) return 5
  if (/^en-(ie|au|nz|za)\b/.test(tag)) return 4
  if (tag === 'en-us' || tag.startsWith('en-us-')) return 3
  if (tag.startsWith('en-') || tag === 'en') return 2
  return 0
}

/**
 * Picks the best English voice, or null when there is none at all.
 * British first, then other English. Within that, an on-device voice beats
 * a network one because the app has to work offline, and the engine's
 * default breaks ties. Returns the index into the list given, because that
 * is how the native plugin selects a voice.
 */
export function chooseVoice(voices: VoiceInfo[]): number | null {
  let best: number | null = null
  let bestScore = 0
  voices.forEach((voice, index) => {
    const lang = langScore(voiceTag(voice))
    if (lang === 0) return
    const networkOnly = !voice.localService || /network/i.test(voice.name)
    const score = lang * 10 + (networkOnly ? 0 : 5) + (voice.default ? 1 : 0)
    if (score > bestScore) {
      best = index
      bestScore = score
    }
  })
  return best
}
