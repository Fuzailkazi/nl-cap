import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20",
        className,
      )}
      {...props}
    />
  );
}
