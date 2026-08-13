import { prisma } from "@/lib/db";
import { requireMerchant } from "@/lib/session";
import { t } from "@/lib/i18n";
import AddPrinterForm from "./AddPrinterForm";

export default async function MerchantPrintersPage() {
  const user = await requireMerchant();
  const printers = await prisma.printer.findMany({
    where: { merchantId: user.id },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t.merchant.myPrinters}</h1>
      </div>

      {printers.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          {t.merchant.noPrinters}
        </div>
      ) : (
        <ul className="grid md:grid-cols-2 gap-3">
          {printers.map((p) => {
            const online = p.active && p.printNodeId != null;
            return (
              <li key={p.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-slate-800">{p.name}</div>
                    <div className="text-xs text-slate-500">
                      {p.district} · {p.location}
                    </div>
                  </div>
                  <span
                    className={
                      "chip " +
                      (online
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500")
                    }
                  >
                    {online ? t.printers.online : t.merchant.pendingConnect}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="chip bg-slate-100 text-slate-600">
                    {p.colorSupported ? t.printers.supportsColor : t.printers.supportsBw}
                  </span>
                  {p.duplexSupported && (
                    <span className="chip bg-slate-100 text-slate-600">
                      {t.common.duplex}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AddPrinterForm />
    </div>
  );
}
