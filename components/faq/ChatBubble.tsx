import type { ReactNode } from "react";

export function ChatBubble({ role, children }: { role: "user" | "assistant"; children: ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
          isUser ? "bg-brand text-brand-fg" : "border border-border bg-surface"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
