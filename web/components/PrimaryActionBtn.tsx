import type { ReactNode } from "react";

export function PrimaryActionBtn({
  disabled,
  onClick,
  children,
}: {
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
