import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { t } from "@/lib/i18n";
import { formatUsd } from "@/lib/pricing";
import { perMerchantSummaries } from "@/lib/analytics";
import { StatCard } from "@/components/Stats";

export default async function AdminHome() {
  await requireAdmin();

  const [summaries, merchantCount, printerCount] = await Promise.all([
    perMerchantSummaries(14),
    prisma.user.count({ where: { role: "MERCHANT" } }),
    prisma.printer.count(),
  ]);

  const todayPages = summaries.reduce((n, s) => n + s.today.pages, 0);
  const todayRevenue = summaries.reduce((n, s) => n + s.today.revenueCents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t.admin.title}</h1>
        <p className="text-slate-500 text-sm mt-1">{t.admin.subtitle}</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <StatCard label={t.admin.merchants} value={merchantCount} />
        <StatCard label={t.admin.printers} value={printerCount} />
        <StatCard label={t.admin.todayPages} value={todayPages} />
        <StatCard label={t.admin.todayRevenue} value={formatUsd(todayRevenue)} />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">{t.admin.merchants}</h2>
          <Link href="/admin/merchants" className="text-sm text-brand-600">
            {t.admin.addMerchant}
          </Link>
        </div>

        {summaries.length === 0 ? (
          <p className="text-sm text-slate-500">{t.admin.noMerchants}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 font-medium">{t.admin.owner}</th>
                  <th className="py-2 font-medium text-right">{t.admin.printers}</th>
                  <th className="py-2 font-medium text-right">{t.admin.todayPages}</th>
                  <th className="py-2 font-medium text-right">{t.admin.todayRevenue}</th>
                  <th className="py-2 font-medium text-right">{t.admin.totalPages}</th>
                  <th className="py-2 font-medium text-right">{t.admin.totalRevenue}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summaries.map((s) => (
                  <tr key={s.merchant.id}>
                    <td className="py-2">
                      <div className="font-medium text-slate-800">
                        {s.merchant.name ?? s.merchant.email.split("@")[0]}
                      </div>
                      <div className="text-xs text-slate-500">{s.merchant.email}</div>
                    </td>
                    <td className="py-2 text-right tabular-nums">{s.printerCount}</td>
                    <td className="py-2 text-right tabular-nums">{s.today.pages}</td>
                    <td className="py-2 text-right tabular-nums">
                      {formatUsd(s.today.revenueCents)}
                    </td>
                    <td className="py-2 text-right tabular-nums">{s.totals.pages}</td>
                    <td className="py-2 text-right tabular-nums">
                      {formatUsd(s.totals.revenueCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
