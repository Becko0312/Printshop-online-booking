import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { t } from "@/lib/i18n";
import { removeMerchantAction } from "../actions";
import AddMerchantForm from "./AddMerchantForm";

export default async function AdminMerchantsPage() {
  await requireAdmin();
  const merchants = await prisma.user.findMany({
    where: { role: "MERCHANT" },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { ownedPrinters: true } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t.admin.merchants}</h1>

      <div className="card p-5">
        {merchants.length === 0 ? (
          <p className="text-sm text-slate-500">{t.admin.noMerchants}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {merchants.map((m) => (
              <li key={m.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800">
                    {m.name ?? m.email.split("@")[0]}
                  </div>
                  <div className="text-xs text-slate-500">
                    {m.email}
                    {m.phone ? ` · ${m.phone}` : ""} · {m._count.ownedPrinters}{" "}
                    {t.admin.printers.toLowerCase()}
                  </div>
                </div>
                <form action={removeMerchantAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <button
                    type="submit"
                    className="btn-ghost text-red-600"
                    formNoValidate
                  >
                    {t.admin.removeMerchant}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AddMerchantForm />
    </div>
  );
}
