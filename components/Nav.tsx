import Link from "next/link";
import { t } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/session";
import { formatUsd } from "@/lib/pricing";

export default async function Nav() {
  const user = await getCurrentUser();
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand-500 text-white text-xs">
            ХҮ
          </span>
          <span>{t.brand}</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="hidden sm:inline text-slate-500">
                {formatUsd(user.walletCents)}
              </span>
              <Link href="/dashboard" className="btn-secondary">
                {t.dashboard.title}
              </Link>
              <form action="/api/auth/signout" method="post">
                <button className="btn-ghost" type="submit">
                  {t.common.signOut}
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/auth/signin" className="btn-ghost">
                {t.common.signIn}
              </Link>
              <Link href="/auth/signup" className="btn-primary">
                {t.common.signUp}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
