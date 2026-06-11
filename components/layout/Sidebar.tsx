import Link from "next/link";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/faq", label: "FAQ Bot" },
  { href: "/reviews", label: "Review Intelligence" },
  { href: "/voice", label: "Voice Scheduler" },
  { href: "/approvals", label: "Approval Centre" },
];

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface p-4 sm:flex">
      <div className="mb-6 px-2">
        <div className="text-sm font-semibold">MF Advisor Suite</div>
        <div className="text-xs text-muted">Facts only · no advice</div>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="rounded-xl px-3 py-2 text-sm transition-colors hover:bg-black/5"
          >
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto px-3 text-xs text-muted">HDFC MF · 4 schemes</div>
    </aside>
  );
}
