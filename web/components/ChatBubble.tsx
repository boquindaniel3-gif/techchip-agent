import type { ReactNode } from "react";
import type { ChatVariant } from "@/lib/types";

export const CLASES_VARIANTE: Record<ChatVariant, string> = {
  success:
    "border border-green-200 border-l-4 border-l-green-600 bg-green-50 text-green-900 shadow-sm dark:border-green-900 dark:border-l-green-500 dark:bg-green-950 dark:text-green-100",
  error:
    "border border-orange-200 border-l-4 border-l-orange-500 bg-orange-50 text-orange-950 shadow-sm dark:border-orange-900 dark:border-l-orange-400 dark:bg-orange-950 dark:text-orange-100",
  system:
    "border border-slate-200 bg-slate-50 text-slate-800 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-100",
  user: "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900",
};

const FORMA: Record<ChatVariant, string> = {
  success: "w-full self-start px-5 py-4",
  error: "w-full self-start px-5 py-4",
  system: "w-full self-start px-5 py-4",
  user: "ml-auto max-w-fit self-end px-4 py-3",
};

export type ChatBubbleProps = {
  role: "user" | "system";
  tone?: "neutral" | "success" | "error";
  children: ReactNode;
};

function varianteDe(role: ChatBubbleProps["role"], tone: NonNullable<ChatBubbleProps["tone"]>): ChatVariant {
  if (role === "user") return "user";
  if (tone === "success" || tone === "error") return tone;
  return "system";
}

export function ChatBubble({ role, tone = "neutral", children }: ChatBubbleProps) {
  const variante = varianteDe(role, tone);
  return (
    <div className={`rounded-lg text-[13px] leading-6 ${FORMA[variante]} ${CLASES_VARIANTE[variante]}`}>
      {children}
    </div>
  );
}
