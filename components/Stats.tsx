import { formatMnt } from "@/lib/pricing";
import { t } from "@/lib/i18n";
import type { DailyStat } from "@/lib/analytics";

export function StatCard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
    </div>
  );
}

// Per-day pages / revenue / job-count table shared by merchant + admin views.
export function DailyTable({ stats }: { stats: DailyStat[] }) {
  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-3">{t.merchant.dailyBreakdown}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-2 font-medium">{t.merchant.date}</th>
              <th className="py-2 font-medium text-right">{t.merchant.pages}</th>
              <th className="py-2 font-medium text-right">{t.merchant.jobs}</th>
              <th className="py-2 font-medium text-right">{t.merchant.revenue}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stats.map((s) => (
              <tr key={s.date}>
                <td className="py-2 text-slate-700">{s.date}</td>
                <td className="py-2 text-right tabular-nums">{s.pages}</td>
                <td className="py-2 text-right tabular-nums text-slate-500">
                  {s.jobs}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatMnt(s.revenueCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
