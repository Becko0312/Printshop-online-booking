import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { t } from "@/lib/i18n";
import { formatMnt } from "@/lib/pricing";

export default async function DashboardHome() {
  const user = await requireUser();
  const [recent, printerCount] = await Promise.all([
    prisma.printJob.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { printer: true, upload: true },
    }),
    prisma.printer.count({ where: { active: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t.dashboard.hello}, {user.name ?? user.email.split("@")[0]} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {printerCount} идэвхтэй хэвлэгч холбогдсон.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-sm text-slate-500">{t.dashboard.walletBalance}</div>
          <div className="text-3xl font-semibold mt-1">
            {formatMnt(user.walletCents)}
          </div>
          <Link href="/dashboard/wallet" className="btn-secondary mt-4">
            {t.dashboard.topUp}
          </Link>
        </div>
        <div className="card p-5">
          <div className="text-sm text-slate-500">{t.dashboard.quickPrint}</div>
          <p className="text-slate-500 text-sm mt-1">
            Файлаа байршуулаад ойрын хэвлэгч рүү шууд илгээ.
          </p>
          <Link href="/dashboard/upload" className="btn-primary mt-4">
            {t.common.upload}
          </Link>
        </div>
        <div className="card p-5">
          <div className="text-sm text-slate-500">{t.dashboard.nav.printers}</div>
          <div className="text-3xl font-semibold mt-1">{printerCount}</div>
          <Link href="/dashboard/printers" className="btn-ghost mt-4">
            {t.dashboard.seeAll}
          </Link>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">{t.dashboard.recentJobs}</h2>
          <Link href="/dashboard/jobs" className="text-sm text-brand-600">
            {t.dashboard.seeAll}
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500">{t.jobs.empty}</p>
        ) : (
          <ul className="divide-y">
            {recent.map((j) => (
              <li key={j.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{j.upload.filename}</div>
                  <div className="text-slate-500 text-xs">
                    {j.printer.name} · {j.pageCount} {t.common.pages} × {j.copies}{" "}
                    {t.common.copies}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-slate-700">{formatMnt(j.costCents)}</div>
                  <div className="text-slate-500 text-xs">
                    {statusLabel(j.status)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function statusLabel(s: string): string {
  return (t.jobs.status as Record<string, string>)[s] ?? s;
}
