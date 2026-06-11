import type { ReactNode } from "react";

function Avatar({ label, user }: { label: string; user?: boolean }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
        user ? "bg-brand text-brand-fg" : "bg-brand/10 text-brand"
      }`}
    >
      {label}
    </span>
  );
}

export function ChatBubble({ role, children }: { role: "user" | "assistant"; children: ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && <Avatar label="A" />}
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser ? "bg-brand text-brand-fg" : "border border-border bg-surface"
        }`}
      >
        {children}
      </div>
      {isUser && <Avatar label="U" user />}
    </div>
  );
}
