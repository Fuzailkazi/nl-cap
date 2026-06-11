import { Card } from "@/components/ui";

/** The single official source link (used by FAQ + the reviews re-query demo). */
export function CitationCard({ url, title }: { url: string; title: string | null }) {
  let host = "source";
  try {
    host = new URL(url).host;
  } catch {
    /* keep fallback */
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block no-underline">
      <Card className="mt-2 text-sm transition-colors hover:bg-black/5">
        <div className="text-xs uppercase tracking-wide text-muted">Source · {host}</div>
        <div className="font-medium text-brand">{title ?? url}</div>
      </Card>
    </a>
  );
}
