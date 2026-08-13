// Throughput + earnings aggregation for merchant and admin dashboards.
//
// Prisma's groupBy can't express "pages × copies", so we fetch the (small)
// set of recent jobs and fold them in JS. Days are bucketed in Ulaanbaatar
// local time (UTC+8) so "today" matches what a shop owner expects.

import { prisma } from "./db";

const UB_OFFSET_MIN = 8 * 60;

// Jobs that actually reached a printer count toward pages + revenue. Failed
// and canceled jobs are refunded, so they never earned anything.
const COUNTED_STATUSES = ["queued", "sent", "printed"];

export function dayKey(d: Date): string {
  return new Date(d.getTime() + UB_OFFSET_MIN * 60_000)
    .toISOString()
    .slice(0, 10);
}

export type DailyStat = {
  date: string; // YYYY-MM-DD in UB local time
  pages: number; // total sheets = pageCount × copies
  revenueCents: number;
  jobs: number;
};

export type Totals = { pages: number; revenueCents: number; jobs: number };

function emptyStat(date: string): DailyStat {
  return { date, pages: 0, revenueCents: 0, jobs: 0 };
}

/**
 * Per-day pages + revenue for a set of printers over the last `days` days,
 * most recent day first. Returns a dense series (days with no jobs are 0) so
 * dashboards can render a stable table/chart.
 */
export async function dailyStatsForPrinters(
  printerIds: string[],
  days = 14,
): Promise<DailyStat[]> {
  // Pre-build a dense, ordered set of day buckets.
  const buckets = new Map<string, DailyStat>();
  const now = Date.now();
  for (let i = 0; i < days; i++) {
    const key = dayKey(new Date(now - i * 86_400_000));
    buckets.set(key, emptyStat(key));
  }

  if (printerIds.length > 0) {
    const since = new Date(now - days * 86_400_000);
    const jobs = await prisma.printJob.findMany({
      where: {
        printerId: { in: printerIds },
        status: { in: COUNTED_STATUSES },
        createdAt: { gte: since },
      },
      select: { createdAt: true, pageCount: true, copies: true, costCents: true },
    });
    for (const j of jobs) {
      const cur = buckets.get(dayKey(j.createdAt));
      if (!cur) continue; // outside the dense window
      cur.pages += j.pageCount * j.copies;
      cur.revenueCents += j.costCents;
      cur.jobs += 1;
    }
  }

  return Array.from(buckets.values()).sort((a, b) =>
    b.date.localeCompare(a.date),
  );
}

export function sumStats(stats: DailyStat[]): Totals {
  return stats.reduce<Totals>(
    (acc, s) => ({
      pages: acc.pages + s.pages,
      revenueCents: acc.revenueCents + s.revenueCents,
      jobs: acc.jobs + s.jobs,
    }),
    { pages: 0, revenueCents: 0, jobs: 0 },
  );
}

export function todayStat(stats: DailyStat[]): DailyStat {
  const key = dayKey(new Date());
  return stats.find((s) => s.date === key) ?? emptyStat(key);
}

export type MerchantSummary = {
  merchant: { id: string; name: string | null; email: string };
  printerCount: number;
  today: DailyStat;
  totals: Totals; // over the window
};

/**
 * One row per merchant with today's + windowed pages/revenue. Used by the
 * admin overview to show every merchant's data at a glance.
 */
export async function perMerchantSummaries(
  days = 14,
): Promise<MerchantSummary[]> {
  const merchants = await prisma.user.findMany({
    where: { role: "MERCHANT" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      ownedPrinters: { select: { id: true } },
    },
  });

  const summaries: MerchantSummary[] = [];
  for (const m of merchants) {
    const printerIds = m.ownedPrinters.map((p) => p.id);
    const stats = await dailyStatsForPrinters(printerIds, days);
    summaries.push({
      merchant: { id: m.id, name: m.name, email: m.email },
      printerCount: printerIds.length,
      today: todayStat(stats),
      totals: sumStats(stats),
    });
  }
  return summaries;
}
