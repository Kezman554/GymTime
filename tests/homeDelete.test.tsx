// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { HomeScreen } from '../src/components/HomeScreen'
import type { Workout } from '../src/storage'

const pushDay: Workout = {
  id: 'push',
  name: 'Push Day',
  exercises: ['Press-ups'],
  workSeconds: 30,
  restSeconds: 10,
  loops: 1,
  loopEnabled: false,
  restBetweenLoopsSeconds: 0,
}

function setup() {
  const onDelete = vi.fn()
  // Stands in for App's back plumbing: the latest interceptor is what Back would call.
  let interceptor: (() => boolean) | null = null
  const setBackInterceptor = (intercept: (() => boolean) | null) => {
    interceptor = intercept
  }
  render(
    <HomeScreen
      workouts={[pushDay]}
      selectedId="push"
      onSelect={() => {}}
      onNew={() => {}}
      onEdit={() => {}}
      onDelete={onDelete}
      onStart={() => {}}
      onOpenSettings={() => {}}
      setBackInterceptor={setBackInterceptor}
    />,
  )
  const pressBack = () => act(() => void interceptor?.())
  return { onDelete, pressBack, getInterceptor: () => interceptor }
}

const deleteButton = () => screen.getByRole('button', { name: 'Delete' })

afterEach(cleanup)

describe('Home delete confirmation', () => {
  it('a single tap on Delete removes nothing and opens the dialog', () => {
    const { onDelete } = setup()
    fireEvent.click(deleteButton())
    expect(onDelete).not.toHaveBeenCalled()
    const dialog = screen.getByRole('alertdialog', { name: 'Delete Push Day?' })
    expect(dialog).toHaveProperty('textContent', expect.stringContaining("can't be undone"))
  })

  it('a double-tap on Delete removes nothing', () => {
    const { onDelete } = setup()
    const footerDelete = deleteButton()
    const pushState = vi.spyOn(window.history, 'pushState')
    fireEvent.click(footerDelete)
    fireEvent.click(footerDelete)
    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.getAllByRole('alertdialog')).toHaveLength(1)
    // One history entry for Back to consume, not one per tap.
    expect(pushState).toHaveBeenCalledTimes(1)
    pushState.mockRestore()
  })

  it('puts Delete on the left, Cancel on the right, and focuses Cancel', () => {
    setup()
    fireEvent.click(deleteButton())
    const buttons = screen.getByRole('alertdialog').querySelectorAll('button')
    expect([...buttons].map((b) => b.textContent)).toEqual(['Delete', 'Cancel'])
    expect(document.activeElement).toBe(buttons[1])
  })

  it('keeps focus inside the dialog', () => {
    setup()
    fireEvent.click(deleteButton())
    const [confirm, cancel] = screen.getByRole('alertdialog').querySelectorAll('button')
    fireEvent.keyDown(cancel, { key: 'Tab' })
    expect(document.activeElement).toBe(confirm)
    fireEvent.keyDown(confirm, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(cancel)
  })

  it('Cancel leaves the workout in place', () => {
    const { onDelete } = setup()
    fireEvent.click(deleteButton())
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('tapping the scrim leaves the workout in place', () => {
    const { onDelete } = setup()
    fireEvent.click(deleteButton())
    fireEvent.click(screen.getByTestId('scrim'))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('Back closes the dialog through the back interceptor and leaves the workout in place', () => {
    const { onDelete, pressBack, getInterceptor } = setup()
    expect(getInterceptor()).toBeNull()
    fireEvent.click(deleteButton())
    expect(getInterceptor()).not.toBeNull()
    pressBack()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(onDelete).not.toHaveBeenCalled()
    // Closed, so Back is no longer claimed.
    expect(getInterceptor()).toBeNull()
  })

  it('confirming deletes the workout it was opened for', () => {
    const { onDelete } = setup()
    fireEvent.click(deleteButton())
    const dialog = screen.getByRole('alertdialog')
    fireEvent.click(dialog.querySelectorAll('button')[0])
    expect(onDelete).toHaveBeenCalledExactlyOnceWith(pushDay)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })
})
