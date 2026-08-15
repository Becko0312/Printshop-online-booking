import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireMerchant } from "@/lib/session";
import { t } from "@/lib/i18n";
import { formatMnt, merchantNetCents, platformFeeCents } from "@/lib/pricing";
import {
  dailyStatsForPrinters,
  sumStats,
  todayStat,
} from "@/lib/analytics";
import { StatCard, DailyTable } from "@/components/Stats";

export default async function MerchantHome() {
  const user = await requireMerchant();

  const printers = await prisma.printer.findMany({
    where: { merchantId: user.id },
    orderBy: { name: "asc" },
  });
  const printerIds = printers.map((p) => p.id);
  const stats = await dailyStatsForPrinters(printerIds, 14);
  const today = todayStat(stats);
  const totals = sumStats(stats);

  // Merchant income = gross print revenue minus the 10% platform fee.
  const todayNet = merchantNetCents(today.revenueCents);
  const windowNet = merchantNetCents(totals.revenueCents);
  const windowFee = platformFeeCents(totals.revenueCents);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t.merchant.title}</h1>
        <p className="text-slate-500 text-sm mt-1">{t.merchant.subtitle}</p>
      </div>

      <div className="card border-brand-200 bg-brand-50/60 p-4">
        <div className="flex items-start gap-3">
          <span className="chip bg-brand-600 text-white shrink-0">10%</span>
          <div>
            <div className="font-medium text-slate-800">
              {t.merchant.serviceFee}
            </div>
            <div className="text-sm text-slate-600 mt-0.5">
              {t.merchant.serviceFeeHint}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <StatCard label={t.merchant.todayPages} value={today.pages} />
        <StatCard
          label={t.merchant.todayNetRevenue}
          value={formatMnt(todayNet)}
        />
        <StatCard label={t.merchant.printerCount} value={printers.length} />
        <StatCard
          label={t.merchant.windowNetRevenue}
          value={formatMnt(windowNet)}
        />
      </div>

      {/* Earnings breakdown over the 14-day window: gross → fee → net. */}
      <div className="card p-5">
        <h2 className="font-semibold mb-3">{t.merchant.earningsTitle}</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-slate-600">{t.merchant.grossSales}</dt>
            <dd className="tabular-nums font-medium">
              {formatMnt(totals.revenueCents)}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-600">{t.merchant.serviceFeeDeduct}</dt>
            <dd className="tabular-nums text-rose-600">
              −{formatMnt(windowFee)}
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-2">
            <dt className="font-medium text-slate-800">
              {t.merchant.netEarnings}
            </dt>
            <dd className="tabular-nums font-semibold text-emerald-700">
              {formatMnt(windowNet)}
            </dd>
          </div>
        </dl>
      </div>

      {printers.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          {t.merchant.noPrinters}
          <div className="mt-4">
            <Link href="/merchant/printers" className="btn-primary">
              {t.merchant.addPrinter}
            </Link>
          </div>
        </div>
      ) : (
        <DailyTable stats={stats} />
      )}
    </div>
  );
}
