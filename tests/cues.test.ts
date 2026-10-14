import { describe, expect, it } from 'vitest'
import { chooseVoice, COMPLETE_CUE, segmentCue, voiceTag, type VoiceInfo } from '../src/audio/cues'
import { buildSegments } from '../src/engine/sequence'
import { createSeedWorkout } from '../src/storage'

describe('segmentCue', () => {
  const exercises = ['Plank', 'Crunch']
  const plain = buildSegments({ ...createSeedWorkout(), exercises, loops: 2 })
  const withLoopRest = buildSegments({ ...createSeedWorkout(), exercises, loops: 3, restBetweenLoopsSeconds: 30 })

  it('speaks each kind of segment', () => {
    expect(plain.map(segmentCue)).toEqual([
      'Get ready. Plank',
      'Go. Plank',
      'Rest. Next up: Crunch',
      'Go. Crunch',
      'Rest. Next up: Plank', // loop boundary without a between-loop rest
      'Go. Plank',
      'Rest. Next up: Crunch',
      'Go. Crunch',
    ])
  })

  it('names the loop just finished on a between-loop rest', () => {
    const loopRests = withLoopRest.filter((segment) => segment.type === 'loopRest').map(segmentCue)
    expect(loopRests).toEqual([
      'Loop 1 complete. Rest. Next up: Plank',
      'Loop 2 complete. Rest. Next up: Plank',
    ])
  })

  it('has a completion cue', () => {
    expect(COMPLETE_CUE).toBe('Workout complete')
  })
})

describe('chooseVoice', () => {
  const v = (lang: string, extra: Partial<VoiceInfo> = {}): VoiceInfo => ({
    name: `voice-${lang}`,
    lang,
    localService: true,
    ...extra,
  })

  it('prefers British English', () => {
    expect(chooseVoice([v('en-US'), v('fr-FR'), v('en-GB')])).toBe(2)
  })

  it('reads Android-style tags and odd casing', () => {
    expect(chooseVoice([v('en_US'), v('EN_gb')])).toBe(1)
  })

  it('falls back to the best other English when there is no en-GB (Samsung TTS)', () => {
    expect(chooseVoice([v('ko-KR'), v('en-US'), v('en-IN'), v('en-AU')])).toBe(3)
    expect(chooseVoice([v('ko-KR'), v('en-IN'), v('en-US')])).toBe(2)
  })

  it('takes an on-device voice over a network one of the same language', () => {
    expect(
      chooseVoice([
        v('en-GB', { name: 'en-gb-x-gba-network', localService: false }),
        v('en-GB', { name: 'en-gb-x-gbb-local' }),
      ]),
    ).toBe(1)
  })

  it('spots network voices by name even when they claim to be local', () => {
    expect(chooseVoice([v('en-GB', { name: 'en-gb-x-rjs-network' }), v('en-GB', { name: 'en-gb-x-rjs-local' })])).toBe(1)
  })

  it('still prefers a British network voice to an American local one', () => {
    expect(chooseVoice([v('en-US'), v('en-GB', { localService: false })])).toBe(1)
  })

  it('uses the engine default to break ties', () => {
    expect(chooseVoice([v('en-GB'), v('en-GB', { default: true })])).toBe(1)
  })

  it('finds the British voice in Samsung TTS, whose lang tags lose the country', () => {
    // As reported by the plugin on the A32 (Samsung TTS 3.5), trimmed.
    const samsung: VoiceInfo[] = [
      { voiceURI: 'de-DE-SMTf00', name: 'German DEU', lang: 'deu-x-lvariant-f00', localService: true },
      { voiceURI: 'en-US-SMTf00', name: 'English USA', lang: 'eng-x-lvariant-f00', localService: true },
      { voiceURI: 'en-US-default', name: 'English USA', lang: 'eng-default', localService: true },
      { voiceURI: 'en-GB-SMTf00', name: 'English GBR', lang: 'eng-x-lvariant-f00', localService: true },
      { voiceURI: 'en-GB-default', name: 'English GBR', lang: 'eng-default', localService: true },
    ]
    const index = chooseVoice(samsung)
    expect(index).toBe(3)
    expect(voiceTag(samsung[index!])).toBe('en-GB')
  })

  it('still ranks a Samsung voice set with no en-GB, taking US English', () => {
    expect(
      chooseVoice([
        { voiceURI: 'ko-KR-SMTf00', name: 'Korean', lang: 'kor-x-lvariant-f00', localService: true },
        { voiceURI: 'en-US-SMTf00', name: 'English USA', lang: 'eng-x-lvariant-f00', localService: true },
      ]),
    ).toBe(1)
  })

  it('treats a bare ISO-639-2 "eng" as English when there is no voice id', () => {
    expect(chooseVoice([v('deu'), v('eng')])).toBe(1)
  })

  it('returns null when nothing is English', () => {
    expect(chooseVoice([v('de-DE'), v('ko-KR')])).toBeNull()
    expect(chooseVoice([])).toBeNull()
  })
})
