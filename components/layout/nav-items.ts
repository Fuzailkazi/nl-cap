export const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/faq", label: "FAQ Bot" },
  { href: "/reviews", label: "Review Intelligence" },
  { href: "/voice", label: "Voice Scheduler" },
  { href: "/approvals", label: "Approval Centre" },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
