import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "danger" | "success" | "ghost";
type Size = "sm" | "md";

const VARIANT: Record<Variant, string> = {
  primary: "bg-brand text-brand-fg hover:opacity-90",
  secondary: "border border-border hover:bg-black/5",
  danger: "bg-rejected text-white hover:opacity-90",
  success: "bg-approved text-white hover:opacity-90",
  ghost: "text-brand hover:underline",
};
const SIZE: Record<Size, string> = {
  sm: "px-3 py-1 text-xs",
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
        "inline-flex items-center justify-center rounded-xl font-medium transition disabled:opacity-50",
        padded && SIZE[size],
        VARIANT[variant],
        className,
      )}
      {...props}
    />
  );
}
