import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { t } from "@/lib/i18n";
import { formatUsd } from "@/lib/pricing";
import { signOutAction } from "@/app/auth/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");

  const items: [string, string][] = [
    ["/dashboard", t.dashboard.nav.overview],
    ["/dashboard/upload", t.dashboard.nav.upload],
    ["/dashboard/printers", t.dashboard.nav.printers],
    ["/dashboard/jobs", t.dashboard.nav.jobs],
    ["/dashboard/wallet", t.dashboard.nav.wallet],
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand-500 text-white text-xs">
              ХҮ
            </span>
            <span>{t.brand}</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="chip bg-brand-50 text-brand-700">
              {t.dashboard.walletBalance}: {formatUsd(user.walletCents)}
            </span>
            <span className="hidden sm:inline text-slate-500">{user.email}</span>
            <form action={signOutAction}>
              <button className="btn-ghost" type="submit">
                {t.common.signOut}
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 grid md:grid-cols-[220px_1fr] gap-6">
        <aside className="space-y-1">
          {items.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              {label}
            </Link>
          ))}
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
