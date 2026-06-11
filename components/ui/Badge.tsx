import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Generic pill. Pass color via className (e.g. text-pending border-pending). */
export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", className)}
      {...props}
    />
  );
}
