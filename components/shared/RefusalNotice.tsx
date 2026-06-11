import { Card } from "@/components/ui";
import type { FaqAnswer } from "@/lib/contracts";

/** Renders advice-refusal and corpus-miss states distinctly. */
export function RefusalNotice({ answer }: { answer: FaqAnswer }) {
  const isAdvice = answer.kind === "advice_refusal";
  return (
    <Card className={`text-sm ${isAdvice ? "border-rejected" : "border-pending"}`}>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
        {isAdvice ? "Advice request — declined" : "No verified source"}
      </div>
      <p>{answer.text}</p>
    </Card>
  );
}
