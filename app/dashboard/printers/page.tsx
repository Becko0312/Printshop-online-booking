import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { t } from "@/lib/i18n";
import { formatMnt } from "@/lib/pricing";

export default async function PrintersPage() {
  await requireUser();
  const printers = await prisma.printer.findMany({
    orderBy: [{ active: "desc" }, { district: "asc" }, { name: "asc" }],
  });

  const byDistrict = new Map<string, typeof printers>();
  for (const p of printers) {
    const arr = byDistrict.get(p.district) ?? [];
    arr.push(p);
    byDistrict.set(p.district, arr);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t.printers.title}</h1>
        <p className="text-slate-500 text-sm mt-1">{t.printers.subtitle}</p>
      </div>

      {printers.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          {t.printers.empty}
        </div>
      ) : (
        Array.from(byDistrict.entries()).map(([district, list]) => (
          <section key={district} className="card p-5">
            <h2 className="font-semibold text-slate-800">{district}</h2>
            <ul className="mt-3 grid md:grid-cols-2 gap-3">
              {list.map((p) => (
                <li
                  key={p.id}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-slate-800">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.location}</div>
                    </div>
                    <span
                      className={
                        "chip " +
                        (p.active && p.printNodeId
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500")
                      }
                    >
                      {p.active && p.printNodeId
                        ? t.printers.online
                        : t.printers.offline}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.colorSupported ? (
                      <span className="chip bg-emerald-50 text-emerald-700">
                        {t.printers.supportsColor}
                      </span>
                    ) : (
                      <span className="chip bg-slate-100 text-slate-600">
                        {t.printers.supportsBw}
                      </span>
                    )}
                    {p.duplexSupported && (
                      <span className="chip bg-slate-100 text-slate-600">
                        {t.common.duplex}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    Хар/цагаан:{" "}
                    {formatMnt(p.bwCentsPerPage ?? Number(process.env.PRICE_BW_CENTS_PER_PAGE ?? 400))}{" "}
                    · Өнгөт:{" "}
                    {formatMnt(p.colorCentsPerPage ?? Number(process.env.PRICE_COLOR_CENTS_PER_PAGE ?? 800))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
