interface SolitaireIconProps {
  className?: string
}

/** Compact playing-card mark for the sister-game link. */
export function SolitaireIcon({ className }: SolitaireIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      width="24"
      height="24"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="4" y="3" width="18" height="24" rx="2.5" fill="#f3ebe0" stroke="#5c4030" strokeWidth="1.4" />
      <rect x="10" y="5" width="18" height="24" rx="2.5" fill="#f7f0e4" stroke="#5c4030" strokeWidth="1.4" />
      <path
        d="M19 12c0 2.2-2.4 4.2-3.5 5.1C14.4 16.2 12 14.2 12 12a2.2 2.2 0 0 1 4.3 0A2.2 2.2 0 0 1 19 12z"
        fill="#a83028"
      />
      <circle cx="15.5" cy="21.5" r="1.1" fill="#2f6b4f" />
      <circle cx="22.5" cy="10.5" r="1.1" fill="#2f6b4f" />
    </svg>
  )
}
