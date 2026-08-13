import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, homeForRole } from "@/lib/session";
import { t } from "@/lib/i18n";
import { signOutAction } from "@/app/auth/actions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");
  if (user.role !== "ADMIN") redirect(homeForRole(user.role));

  const items: [string, string][] = [
    ["/admin", t.admin.nav.overview],
    ["/admin/merchants", t.admin.nav.merchants],
    ["/admin/printers", t.admin.nav.printers],
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white text-xs">
              ХҮ
            </span>
            <span>{t.brand}</span>
            <span className="chip bg-slate-900 text-white">Admin</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
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
