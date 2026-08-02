import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { t } from "@/lib/i18n";
import { formatUsd } from "@/lib/pricing";

export default async function JobsPage() {
  const user = await requireUser();
  const jobs = await prisma.printJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { printer: true, upload: true },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t.jobs.title}</h1>
      {jobs.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">{t.jobs.empty}</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="text-left px-4 py-3">Огноо</th>
                <th className="text-left px-4 py-3">Файл</th>
                <th className="text-left px-4 py-3">Хэвлэгч</th>
                <th className="text-right px-4 py-3">Хуудас</th>
                <th className="text-right px-4 py-3">Үнэ</th>
                <th className="text-right px-4 py-3">Төлөв</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-t">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {j.createdAt.toLocaleString("mn-MN")}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {j.upload.filename}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{j.printer.name}</td>
                  <td className="px-4 py-3 text-right">
                    {j.pageCount} × {j.copies}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatUsd(j.costCents)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={
                        "chip " +
                        (j.status === "printed" || j.status === "sent"
                          ? "bg-emerald-50 text-emerald-700"
                          : j.status === "failed" || j.status === "canceled"
                            ? "bg-red-50 text-red-700"
                            : "bg-slate-100 text-slate-600")
                      }
                    >
                      {(t.jobs.status as Record<string, string>)[j.status] ??
                        j.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
