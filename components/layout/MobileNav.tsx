"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV, isActive } from "./nav-items";

export function MobileNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-10 flex items-center gap-1 overflow-x-auto border-b border-border bg-surface px-3 py-2 sm:hidden">
      <span className="mr-2 shrink-0 text-sm font-semibold">MF Suite</span>
      {NAV.map((n) => {
        const active = isActive(pathname, n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-lg px-2 py-1 text-xs",
              active ? "bg-brand/10 text-brand" : "text-muted",
            )}
          >
            {n.label}
          </Link>
        );
      })}
    </header>
  );
}
