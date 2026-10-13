import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, MemoryKeyValueStore, SettingsStore } from '../src/storage'
import { beepSpec } from '../src/audio/beeps'

describe('SettingsStore', () => {
  it('defaults to speech and beeps on', async () => {
    expect(await new SettingsStore(new MemoryKeyValueStore()).load()).toEqual({ speech: true, beeps: true })
  })

  it('persists across store instances on the same storage', async () => {
    const kv = new MemoryKeyValueStore()
    await new SettingsStore(kv).save({ speech: false, beeps: true })
    expect(await new SettingsStore(kv).load()).toEqual({ speech: false, beeps: true })
  })

  it('falls back field by field on corrupt or partial data', async () => {
    const kv = new MemoryKeyValueStore()
    await kv.set('gymtime.settings', '{not json')
    expect(await new SettingsStore(kv).load()).toEqual(DEFAULT_SETTINGS)
    await kv.set('gymtime.settings', JSON.stringify({ beeps: false, speech: 'yes' }))
    expect(await new SettingsStore(kv).load()).toEqual({ speech: true, beeps: false })
    await kv.set('gymtime.settings', 'null')
    expect(await new SettingsStore(kv).load()).toEqual(DEFAULT_SETTINGS)
  })

  it('hands out copies, not the shared defaults', async () => {
    const settings = await new SettingsStore(new MemoryKeyValueStore()).load()
    settings.beeps = false
    expect(DEFAULT_SETTINGS.beeps).toBe(true)
  })
})

describe('beepSpec', () => {
  it('pips on 3 and 2, a higher and longer tone on 1', () => {
    expect(beepSpec(3)).toEqual(beepSpec(2))
    expect(beepSpec(1).frequency).toBeGreaterThan(beepSpec(2).frequency)
    expect(beepSpec(1).durationMs).toBeGreaterThan(beepSpec(2).durationMs)
    // A pip must end well inside its second so 3-2-1 never run together.
    expect(beepSpec(2).durationMs).toBeLessThan(500)
  })
})
