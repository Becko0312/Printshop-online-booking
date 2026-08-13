import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { t } from "@/lib/i18n";
import { assignPrinterAction, removePrinterAction } from "../actions";
import AddPrinterForm from "./AddPrinterForm";

function merchantLabel(m: { name: string | null; email: string }): string {
  return m.name ? `${m.name} (${m.email})` : m.email;
}

export default async function AdminPrintersPage() {
  await requireAdmin();

  const [printers, merchants] = await Promise.all([
    prisma.printer.findMany({
      orderBy: [{ active: "desc" }, { district: "asc" }, { name: "asc" }],
      include: { merchant: { select: { id: true, name: true, email: true } } },
    }),
    prisma.user.findMany({
      where: { role: "MERCHANT" },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  const merchantOptions = merchants.map((m) => ({
    id: m.id,
    label: merchantLabel(m),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t.admin.printers}</h1>

      <div className="card p-5">
        {printers.length === 0 ? (
          <p className="text-sm text-slate-500">{t.printers.empty}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {printers.map((p) => {
              const online = p.active && p.printNodeId != null;
              return (
                <li
                  key={p.id}
                  className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{p.name}</span>
                      <span
                        className={
                          "chip " +
                          (online
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500")
                        }
                      >
                        {online ? t.printers.online : t.printers.offline}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {p.district} · {p.location}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <form action={assignPrinterAction} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <select
                        name="merchantId"
                        // key changes with the saved owner so React remounts the
                        // (uncontrolled) select after a save and it reflects the
                        // new value instead of snapping back to its first render.
                        key={p.merchantId ?? "none"}
                        defaultValue={p.merchantId ?? ""}
                        className="input py-1.5 text-sm"
                      >
                        <option value="">{t.admin.unassigned}</option>
                        {merchantOptions.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="btn-ghost text-sm">
                        {t.common.save}
                      </button>
                    </form>

                    <form action={removePrinterAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className="btn-ghost text-sm text-red-600">
                        {t.admin.removePrinter}
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AddPrinterForm merchants={merchantOptions} />
    </div>
  );
}
