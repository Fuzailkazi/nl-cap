import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Surface container — single source of card styling. `interactive` adds hover lift. */
export function Card({
  className,
  interactive,
  ...props
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface p-5 shadow-sm",
        interactive && "cursor-pointer transition duration-150 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md",
        className,
      )}
      {...props}
    />
  );
}
