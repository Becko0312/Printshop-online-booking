import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { t } from "@/lib/i18n";
import { formatMnt } from "@/lib/pricing";
import { getBonumTiers, isConfigured as bonumConfigured } from "@/lib/bonum";
import { startBonumTopUpAction, redeemPromoAction } from "./actions";

const PROMO_ERRORS: Record<string, string> = {
  empty: t.promo.errEmpty,
  invalid: t.promo.errInvalid,
  expired: t.promo.errExpired,
  exhausted: t.promo.errExhausted,
  used: t.promo.errUsed,
  error: t.promo.errGeneric,
};

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ topup?: string; promo?: string; amt?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const promoError = params.promo ? PROMO_ERRORS[params.promo] : undefined;
  const promoAmt = Number(params.amt ?? 0);
  const tiers = getBonumTiers();
  const configured = bonumConfigured();
  const txs = await prisma.walletTx.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t.wallet.title}</h1>
        <p className="text-slate-500 text-sm mt-1">{t.wallet.subtitle}</p>
      </div>

      {params.topup === "success" && (
        <div className="card border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {t.wallet.topupSuccess}
        </div>
      )}
      {params.topup === "canceled" && (
        <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {t.wallet.topupCanceled}
        </div>
      )}
      {params.topup === "pending" && (
        <div className="card border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
          {t.wallet.topupPending}
        </div>
      )}
      {params.promo === "success" && (
        <div className="card border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {t.promo.success} <strong>{formatMnt(promoAmt)}</strong>
        </div>
      )}
      {promoError && (
        <div className="card border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {promoError}
        </div>
      )}

      <div className="card p-6">
        <div className="text-sm text-slate-500">{t.wallet.balance}</div>
        <div className="text-4xl font-semibold mt-1">
          {formatMnt(user.walletCents)}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold">{t.promo.title}</h2>
        <p className="mt-1 text-sm text-slate-500">{t.promo.subtitle}</p>
        <form action={redeemPromoAction} className="mt-4 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            name="code"
            required
            autoComplete="off"
            spellCheck={false}
            placeholder={t.promo.placeholder}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 uppercase tracking-wide focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700"
          >
            {t.promo.redeem}
          </button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold">{t.wallet.bonumTitle}</h2>
        <p className="mt-1 text-sm text-slate-500">{t.wallet.bonumHint}</p>
        {!configured && (
          <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
            {t.wallet.bonumUnconfigured}
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          {tiers.map((tier) => (
            <form action={startBonumTopUpAction} key={tier.label}>
              <input type="hidden" name="amountMnt" value={tier.amountMnt} />
              <button
                type="submit"
                disabled={!configured}
                className="w-full rounded-lg border border-slate-200 p-5 text-center hover:border-brand-500 hover:bg-brand-50/40 disabled:opacity-50"
              >
                <div className="text-2xl font-semibold">{tier.label}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {formatMnt(tier.amountMnt)} кредит
                </div>
              </button>
            </form>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold mb-3">{t.wallet.history}</h2>
        {txs.length === 0 ? (
          <p className="text-sm text-slate-500">Гүйлгээ байхгүй.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-xs">
              <tr>
                <th className="text-left py-2">Огноо</th>
                <th className="text-left py-2">Утга</th>
                <th className="text-right py-2">Дүн</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((tx) => (
                <tr key={tx.id} className="border-t">
                  <td className="py-2 text-slate-600 whitespace-nowrap">
                    {tx.createdAt.toLocaleString("mn-MN")}
                  </td>
                  <td className="py-2 text-slate-700">
                    {tx.description ?? tx.kind}
                  </td>
                  <td
                    className={
                      "py-2 text-right font-medium " +
                      (tx.amountCents >= 0 ? "text-emerald-700" : "text-slate-800")
                    }
                  >
                    {tx.amountCents >= 0 ? "+" : ""}
                    {formatMnt(tx.amountCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
