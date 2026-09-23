import type { ReactNode } from "react";
import { ChatBubble, CLASES_VARIANTE } from "@/components/ChatBubble";
import type { ChatVariant } from "@/lib/types";

export { CLASES_VARIANTE };

export function ChatMessage({
  variant,
  children,
}: {
  variant: ChatVariant;
  children: ReactNode;
}) {
  const role = variant === "user" ? "user" : "system";
  const tone = variant === "success" || variant === "error" ? variant : "neutral";
  return (
    <ChatBubble role={role} tone={tone}>
      {children}
    </ChatBubble>
  );
}
