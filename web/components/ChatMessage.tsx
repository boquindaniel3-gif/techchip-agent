import type { ReactNode } from "react";
import type { ChatVariant } from "@/lib/types";

export const CLASES_VARIANTE: Record<ChatVariant, string> = {
  success: "bg-green-50 text-green-900 border-l-4 border-green-600",
  error: "bg-orange-50 text-orange-950 border-l-4 border-orange-500",
  system: "bg-slate-100 text-foreground",
  user: "ml-auto bg-accent text-background",
};

export function ChatMessage({
  variant,
  children,
}: {
  variant: ChatVariant;
  children: ReactNode;
}) {
  return (
    <div
      className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-5 ${CLASES_VARIANTE[variant]}`}
    >
      {children}
    </div>
  );
}
