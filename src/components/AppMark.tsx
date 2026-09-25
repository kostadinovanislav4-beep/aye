/** Знакът на AYE: тъмносиня отметка върху светлосин квадрат (същият като иконата). */
export function AppMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" className={className}>
      <rect width="512" height="512" rx="112" fill="#8ccbff" />
      <path
        d="M150 268 224 342 366 178"
        fill="none"
        stroke="#0e2640"
        strokeWidth="56"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
