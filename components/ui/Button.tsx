import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "danger" | "success" | "ghost";
type Size = "sm" | "md";

const VARIANT: Record<Variant, string> = {
  primary: "bg-brand text-brand-fg hover:opacity-90 active:scale-[0.98]",
  secondary: "border border-border hover:bg-black/5 active:scale-[0.98]",
  danger: "bg-rejected text-white hover:opacity-90 active:scale-[0.98]",
  success: "bg-approved text-white hover:opacity-90 active:scale-[0.98]",
  ghost: "text-brand hover:underline",
};
const SIZE: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  const padded = variant !== "ghost";
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition duration-150 outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-50 disabled:active:scale-100",
        padded && SIZE[size],
        VARIANT[variant],
        className,
      )}
      {...props}
    />
  );
}
