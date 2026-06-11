import { cn } from "@/lib/utils";

/** Loading placeholder — shimmer block. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-black/5", className)} />;
}
