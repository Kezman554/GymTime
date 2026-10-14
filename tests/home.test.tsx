// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { HomeScreen } from '../src/components/HomeScreen'
import type { Workout } from '../src/storage'

const workout = (id: string, name: string): Workout => ({
  id,
  name,
  exercises: ['Press-ups'],
  workSeconds: 30,
  restSeconds: 10,
  loops: 1,
  loopEnabled: false,
  restBetweenLoopsSeconds: 0,
})
const pushDay = workout('push', 'Push Day')
const legDay = workout('legs', 'Leg Day')

function setup(selectedId: string | null = 'push') {
  const props = {
    onSelect: vi.fn(),
    onNew: vi.fn(),
    onEdit: vi.fn(),
    onStart: vi.fn(),
    onOpenSettings: vi.fn(),
  }
  render(<HomeScreen workouts={[pushDay, legDay]} selectedId={selectedId} {...props} />)
  return props
}

afterEach(cleanup)

describe('Home', () => {
  it('has only Start in the footer: no New, Edit or Delete there', () => {
    setup()
    const footer = document.querySelector('.home__footer')!
    expect([...footer.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Start'])
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('the round plus button creates a workout, the cog opens Settings', () => {
    const { onNew, onOpenSettings } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'New workout' }))
    expect(onNew).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(onOpenSettings).toHaveBeenCalledOnce()
  })

  it('shows the edit icon only on the selected row, labelled with its workout', () => {
    const { onEdit } = setup('push')
    expect(screen.getAllByRole('button', { name: /^Edit / })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Edit Push Day' }))
    expect(onEdit).toHaveBeenCalledExactlyOnceWith(pushDay)
    expect(screen.queryByRole('button', { name: 'Edit Leg Day' })).toBeNull()
  })

  it('reserves the edit slot on every row, so selection never reflows a row', () => {
    setup('push')
    expect(document.querySelectorAll('.workout-item__edit-slot')).toHaveLength(2)
  })

  it('marks the selected row as pressed', () => {
    const { onSelect } = setup('push')
    expect(screen.getByRole('button', { name: /Push Day/, pressed: true })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Leg Day/, pressed: false }))
    expect(onSelect).toHaveBeenCalledWith('legs')
  })

  it('has no caption explaining the dials', () => {
    setup()
    expect(screen.queryByText(/share of each round/i)).toBeNull()
  })
})
