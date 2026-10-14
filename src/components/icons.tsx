/**
 * Inline stroke icons. Decorative: the accessible name lives on the button,
 * so every icon is aria-hidden. Colour comes from currentColor.
 */

function Icon({ d }: { d: string }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}

export const ChevronUpIcon = () => <Icon d="M6 15l6-6 6 6" />
export const ChevronDownIcon = () => <Icon d="M6 9l6 6 6-6" />
export const CrossIcon = () => <Icon d="M6 6l12 12M18 6L6 18" />
export const PlusIcon = () => <Icon d="M12 5v14M5 12h14" />
export const MinusIcon = () => <Icon d="M5 12h14" />
