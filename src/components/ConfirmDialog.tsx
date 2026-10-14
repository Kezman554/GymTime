import { useEffect, useId, useRef, type KeyboardEvent } from 'react'

interface ConfirmDialogProps {
  question: string
  detail: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  /**
   * Viewport-bottom distance of the button row's bottom edge, so the row can
   * sit exactly over the buttons that opened it. Omitted: the dialog sits at
   * the bottom of the screen.
   */
  rowBottom?: number
}

/**
 * A destructive confirmation over a scrim. Confirm is on the LEFT and quiet;
 * Cancel is on the RIGHT, primary, and focused on open. The order is
 * deliberate: the button that opened it is rightmost in its row, so a
 * double-tap lands on Cancel. Same as the timer's stop confirmation.
 */
export function ConfirmDialog({ question, detail, confirmLabel, onConfirm, onCancel, rowBottom }: ConfirmDialogProps) {
  const questionId = useId()
  const detailId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  // Two buttons, so the trap is just Tab and Shift+Tab swapping between them.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
    } else if (event.key === 'Tab') {
      event.preventDefault()
      const next = document.activeElement === cancelRef.current ? confirmRef.current : cancelRef.current
      next?.focus()
    }
  }

  return (
    <>
      <div className="scrim" data-testid="scrim" onClick={onCancel} />
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={questionId}
        aria-describedby={detailId}
        onKeyDown={onKeyDown}
        style={rowBottom === undefined ? undefined : { bottom: `calc(${rowBottom}px - 1.25rem - 1px)` }}
      >
        <h2 id={questionId} className="dialog__question">
          {question}
        </h2>
        <p id={detailId} className="dialog__detail">
          {detail}
        </p>
        <div className="button-row">
          <button ref={confirmRef} type="button" className="btn dialog__btn dialog__btn--danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button ref={cancelRef} type="button" className="btn dialog__btn dialog__btn--primary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}
