/** Plain geometric ✓ — stroke SVG (~2px), not unicode. Locked MJ-15C. */
export default function CheckMark({ className = 'tick-mark' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M3.2 8.4 L6.6 11.6 L12.8 4.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
