// The Atlas mark: a drafting compass rose, drawn in the accent ink.
export function BrandMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle
        cx={12}
        cy={12}
        r={10.25}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        opacity={0.45}
      />
      <path
        d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.45}
      />
      <path d="M12 5.5l2.6 6.5H9.4z" fill="currentColor" />
      <path
        d="M12 18.5l-2.6-6.5h5.2z"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </svg>
  );
}
