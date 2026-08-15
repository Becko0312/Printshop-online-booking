import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireMerchant } from "@/lib/session";
import { t } from "@/lib/i18n";
import { formatMnt } from "@/lib/pricing";
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
          label={t.merchant.todayRevenue}
          value={formatMnt(today.revenueCents)}
        />
        <StatCard label={t.merchant.printerCount} value={printers.length} />
        <StatCard
          label={t.merchant.windowRevenue}
          value={formatMnt(totals.revenueCents)}
        />
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
