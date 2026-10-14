// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { EditorScreen } from '../src/components/EditorScreen'
import type { NewWorkout, Workout } from '../src/storage'

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
const newWorkout: NewWorkout = {
  name: pushDay.name,
  exercises: pushDay.exercises,
  workSeconds: pushDay.workSeconds,
  restSeconds: pushDay.restSeconds,
  loops: pushDay.loops,
  loopEnabled: pushDay.loopEnabled,
  restBetweenLoopsSeconds: pushDay.restBetweenLoopsSeconds,
}

function setup(initial: NewWorkout | Workout = pushDay) {
  const onDelete = vi.fn()
  // Stands in for App's back plumbing: the latest interceptor is what Back would call.
  let interceptor: (() => boolean) | null = null
  let stayed: boolean | undefined
  render(
    <EditorScreen
      initial={initial}
      onSave={async () => {}}
      onCancel={() => {}}
      onDelete={onDelete}
      setBackInterceptor={(intercept) => {
        interceptor = intercept
      }}
    />,
  )
  const pressBack = () =>
    act(() => {
      stayed = interceptor?.()
    })
  return { onDelete, pressBack, getInterceptor: () => interceptor, stayed: () => stayed }
}

/** The editor's own Delete, not the dialog's. */
const editorDelete = () => document.querySelector<HTMLButtonElement>('.editor__delete')!

afterEach(cleanup)

describe('Editor delete', () => {
  it('offers no Delete when creating a new workout', () => {
    setup(newWorkout)
    expect(document.querySelector('.editor__delete')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull()
  })

  it('offers Delete below Cancel and Save when editing a saved workout', () => {
    setup()
    const buttons = [...document.querySelectorAll('.editor__footer button')].map((b) => b.textContent)
    expect(buttons.slice(-3)).toEqual(['Cancel', 'Save', 'Delete'])
  })

  it('a single tap on Delete removes nothing and opens the dialog', () => {
    const { onDelete } = setup()
    fireEvent.click(editorDelete())
    expect(onDelete).not.toHaveBeenCalled()
    const dialog = screen.getByRole('alertdialog', { name: 'Delete Push Day?' })
    expect(dialog.textContent).toContain("can't be undone")
  })

  it('a double-tap on Delete removes nothing', () => {
    const { onDelete } = setup()
    fireEvent.click(editorDelete())
    fireEvent.click(editorDelete())
    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.getAllByRole('alertdialog')).toHaveLength(1)
  })

  it('puts Delete on the left, Cancel on the right, and focuses Cancel', () => {
    setup()
    fireEvent.click(editorDelete())
    const buttons = screen.getByRole('alertdialog').querySelectorAll('button')
    expect([...buttons].map((b) => b.textContent)).toEqual(['Delete', 'Cancel'])
    expect(document.activeElement).toBe(buttons[1])
  })

  it('keeps focus inside the dialog', () => {
    setup()
    fireEvent.click(editorDelete())
    const [confirm, cancel] = screen.getByRole('alertdialog').querySelectorAll('button')
    fireEvent.keyDown(cancel, { key: 'Tab' })
    expect(document.activeElement).toBe(confirm)
    fireEvent.keyDown(confirm, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(cancel)
  })

  it('Cancel leaves the workout in place', () => {
    const { onDelete } = setup()
    fireEvent.click(editorDelete())
    // The dialog's Cancel, not the editor's own.
    fireEvent.click(screen.getByRole('alertdialog').querySelectorAll('button')[1])
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('tapping the scrim leaves the workout in place', () => {
    const { onDelete } = setup()
    fireEvent.click(editorDelete())
    fireEvent.click(screen.getByTestId('scrim'))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('Back closes the dialog, stays in the editor, and leaves the workout in place', () => {
    const { onDelete, pressBack, getInterceptor, stayed } = setup()
    expect(getInterceptor()).toBeNull()
    fireEvent.click(editorDelete())
    expect(getInterceptor()).not.toBeNull()
    pressBack()
    expect(stayed()).toBe(true)
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Edit workout' })).toBeTruthy()
    expect(onDelete).not.toHaveBeenCalled()
    expect(getInterceptor()).toBeNull()
  })

  it('confirming deletes the workout as saved, not as edited', () => {
    const { onDelete } = setup()
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Renamed but unsaved' } })
    fireEvent.click(editorDelete())
    fireEvent.click(screen.getByRole('alertdialog').querySelectorAll('button')[0])
    expect(onDelete).toHaveBeenCalledExactlyOnceWith(pushDay)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })
})
