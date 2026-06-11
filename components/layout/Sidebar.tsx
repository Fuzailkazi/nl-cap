"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV, isActive } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface p-4 sm:flex">
      <div className="mb-6 px-2">
        <div className="text-sm font-semibold">MF Advisor Suite</div>
        <div className="text-xs text-muted">Facts only · no advice</div>
      </div>
      <div className="label mb-1 px-3">Pillars</div>
      <nav className="flex flex-col gap-1">
        {NAV.map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "rounded-xl px-3 py-2 text-sm transition-colors",
                active ? "bg-brand/10 font-medium text-brand" : "text-fg hover:bg-black/5",
              )}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-3 text-xs text-muted">HDFC MF · 4 schemes</div>
    </aside>
  );
}
