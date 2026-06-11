import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "MF Advisor Intelligence Suite",
  description: "Voice-first mutual fund support assistant — facts only, no advice.",
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/faq", label: "FAQ Bot" },
  { href: "/approvals", label: "Approval Centre" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="flex min-h-screen">
          <aside
            className="hidden w-60 shrink-0 flex-col border-r p-4 sm:flex"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <div className="mb-6 px-2">
              <div className="text-sm font-semibold">MF Advisor Suite</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                Facts only · no advice
              </div>
            </div>
            <nav className="flex flex-col gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto px-3 text-xs" style={{ color: "var(--muted)" }}>
              HDFC MF · 4 schemes
            </div>
          </aside>
          <main className="flex-1 px-5 py-6 sm:px-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
