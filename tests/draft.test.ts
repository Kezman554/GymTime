import { describe, expect, it } from 'vitest'
import { fromDraft, moveItem, parseWhole, toDraft } from '../src/components/draft'
import { createSeedWorkout, validateWorkout } from '../src/storage'

describe('editor draft', () => {
  it('round-trips a workout unchanged', () => {
    const seed = createSeedWorkout()
    expect(fromDraft(toDraft(seed))).toEqual(seed)
    const saved = { ...seed, id: 'abc' }
    expect(fromDraft(toDraft(saved))).toEqual(saved)
  })

  it('turns cleared or non-numeric fields into values validation rejects', () => {
    const draft = { ...toDraft(createSeedWorkout()), workSeconds: '', loops: '2.5' }
    const issues = validateWorkout(fromDraft(draft))
    expect(issues.some((issue) => issue.startsWith('work time'))).toBe(true)
    expect(issues.some((issue) => issue.startsWith('loops'))).toBe(true)
  })

  it('trims names on the way out', () => {
    const draft = toDraft({ ...createSeedWorkout(), name: '  Legs ', exercises: [' Squat '] })
    const workout = fromDraft(draft)
    expect(workout.name).toBe('Legs')
    expect(workout.exercises).toEqual(['Squat'])
  })
})

describe('parseWhole', () => {
  it.each([
    ['45', 45],
    [' 0 ', 0],
  ])('parses %j', (text, expected) => expect(parseWhole(text)).toBe(expected))

  it.each(['', '-5', '4.5', '1e2', 'abc'])('rejects %j', (text) =>
    expect(parseWhole(text)).toBeNaN(),
  )
})

describe('moveItem', () => {
  it('moves up and down without mutating the input', () => {
    const items = ['a', 'b', 'c']
    expect(moveItem(items, 2, 1)).toEqual(['a', 'c', 'b'])
    expect(moveItem(items, 0, 1)).toEqual(['b', 'a', 'c'])
    expect(items).toEqual(['a', 'b', 'c'])
  })

  it('ignores moves off either end', () => {
    const items = ['a', 'b']
    expect(moveItem(items, 0, -1)).toBe(items)
    expect(moveItem(items, 1, 2)).toBe(items)
  })
})
