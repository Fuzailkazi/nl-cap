export function BookingCodeBadge({ code }: { code: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-brand px-3 py-1 font-mono text-base font-semibold tracking-wider text-brand-fg">
      {code}
    </span>
  );
}
