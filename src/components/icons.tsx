/**
 * Inline stroke icons. Decorative: the accessible name lives on the button,
 * so every icon is aria-hidden. Colour comes from currentColor.
 */

function Icon({ d, size = 22 }: { d: string; size?: number }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
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
export const PencilIcon = () => <Icon d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" />
/** Eight-toothed cog around a hub. */
export const CogIcon = () => (
  <Icon
    size={24}
    d="M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6zM10.5 3h3l.5 2.5 2 .9 2.2-1.4 2.1 2.1-1.4 2.2.9 2 2.5.5v3l-2.5.5-.9 2 1.4 2.2-2.1 2.1-2.2-1.4-2 .9-.5 2.5h-3l-.5-2.5-2-.9-2.2 1.4-2.1-2.1 1.4-2.2-.9-2L3 13.5v-3l2.5-.5.9-2L5 5.8l2.1-2.1L9.3 5.1l2-.9z"
  />
)
