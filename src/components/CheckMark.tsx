/** Tick C — plain geometric stroke SVG (locked craft). Soft green via currentColor. */
export function CheckMark({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
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
