import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20",
        className,
      )}
      {...props}
    />
  );
}
