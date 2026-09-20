type Props = {
  size?: number;
  className?: string;
};

export function Logo({ size = 32, className = "" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="58" height="58" rx="14" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="14" width="10" height="10" rx="2" fill="currentColor" />
      <rect x="27" y="14" width="10" height="10" rx="2" fill="currentColor" opacity="0.35" />
      <rect x="40" y="14" width="10" height="10" rx="2" fill="currentColor" />
      <rect x="14" y="27" width="10" height="10" rx="2" fill="currentColor" opacity="0.35" />
      <rect x="27" y="27" width="10" height="10" rx="2" fill="currentColor" />
      <rect x="40" y="27" width="10" height="10" rx="2" fill="currentColor" opacity="0.35" />
      <rect x="14" y="44" width="36" height="3" rx="1.5" fill="currentColor" />
      <circle cx="32" cy="51.5" r="2.5" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 text-foreground ${className}`}>
      <Logo size={size} />
      <span className="text-[15px] font-semibold tracking-tight">TechChip Agent</span>
    </span>
  );
}
