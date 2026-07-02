import Link from "next/link";
import { logout } from "@/app/dashboard/[slug]/login/actions";
import Footer from "./Footer";

type NavKey = "active" | "archive" | "settings";

const NAV: { key: NavKey; label: string; href: (s: string) => string }[] = [
  { key: "active", label: "Active Requests", href: (s) => `/dashboard/${s}` },
  { key: "archive", label: "Archive", href: (s) => `/dashboard/${s}/archive` },
  { key: "settings", label: "Settings", href: (s) => `/dashboard/${s}/settings` },
];

export default function DashboardShell({
  slug,
  hoaName,
  active,
  children,
}: {
  slug: string;
  hoaName: string;
  active: NavKey;
  children: React.ReactNode;
}) {
  const logoutAction = logout.bind(null, slug);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold text-brand-700">
                ARCTrack
              </span>
              <span className="hidden text-sm text-ink-muted sm:inline">
                &middot; {hoaName}
              </span>
            </div>
            <form action={logoutAction}>
              <button className="text-sm text-ink-soft hover:text-ink hover:underline">
                Sign out
              </button>
            </form>
          </div>
          <nav className="flex gap-1 -mb-px">
            {NAV.map((item) => (
              <Link
                key={item.key}
                href={item.href(slug)}
                className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
                  active === item.key
                    ? "border-brand-700 text-brand-700"
                    : "border-transparent text-ink-muted hover:text-ink-soft"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
