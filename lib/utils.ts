/** Join class names, dropping falsy values. Tiny clsx replacement. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
