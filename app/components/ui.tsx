import type { ApprovalStatus, FaqAnswer } from "@/lib/contracts";

/** Presentational, hook-free components — usable from server or client. */

const card =
  "rounded-[var(--radius)] border p-4" as const;
const cardStyle = { borderColor: "var(--border)", background: "var(--surface)" };

export function StatusBadge({ status }: { status: ApprovalStatus }) {
  const color =
    status === "approved"
      ? "var(--color-approved)"
      : status === "rejected"
        ? "var(--color-rejected)"
        : "var(--color-pending)";
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ color, border: `1px solid ${color}` }}
    >
      {status}
    </span>
  );
}

export function CitationCard({ url, title }: { url: string; title: string | null }) {
  let host = "";
  try {
    host = new URL(url).host;
  } catch {
    host = "source";
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${card} mt-2 block text-sm no-underline transition-colors hover:bg-black/5 dark:hover:bg-white/10`}
      style={cardStyle}
    >
      <div className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>
        Source · {host}
      </div>
      <div className="font-medium" style={{ color: "var(--color-brand)" }}>
        {title ?? url}
      </div>
    </a>
  );
}

/** Renders advice-refusal and corpus-miss states distinctly. */
export function RefusalNotice({ answer }: { answer: FaqAnswer }) {
  const isAdvice = answer.kind === "advice_refusal";
  return (
    <div
      className={`${card} text-sm`}
      style={{ ...cardStyle, borderColor: isAdvice ? "var(--color-rejected)" : "var(--color-pending)" }}
    >
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
        {isAdvice ? "Advice request — declined" : "No verified source"}
      </div>
      <p>{answer.text}</p>
    </div>
  );
}

export function ChatBubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[80%] rounded-[var(--radius)] px-3 py-2 text-sm"
        style={
          isUser
            ? { background: "var(--color-brand)", color: "var(--color-brand-fg)" }
            : { background: "var(--surface)", border: "1px solid var(--border)" }
        }
      >
        {children}
      </div>
    </div>
  );
}

export { card as cardClass, cardStyle };
