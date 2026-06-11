import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Surface container — the single source of card styling across the app. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-border bg-surface p-4", className)} {...props} />;
}
