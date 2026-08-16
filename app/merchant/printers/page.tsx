import { prisma } from "@/lib/db";
import { requireMerchant } from "@/lib/session";
import { t } from "@/lib/i18n";
import AddPrinterForm from "./AddPrinterForm";
import {
  activateStandaloneAction,
  deactivateStandaloneAction,
  generateAgentTokenAction,
} from "./actions";

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
            const printNode = p.active && p.printNodeId != null;
            const standalone = p.active && p.printNodeId == null;
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
                      (printNode
                        ? "bg-emerald-50 text-emerald-700"
                        : standalone
                          ? "bg-sky-50 text-sky-700"
                          : "bg-slate-100 text-slate-500")
                    }
                  >
                    {printNode
                      ? t.printers.online
                      : standalone
                        ? t.merchant.standaloneActive
                        : t.merchant.pendingConnect}
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

                {/* Standalone-agent connect key + activation (only relevant for
                    printers not linked to PrintNode). */}
                {p.printNodeId == null && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <div className="text-xs text-slate-500">
                      {t.merchant.printerKey} (PRINTER_KEY)
                    </div>
                    <code className="mt-0.5 block break-all rounded bg-slate-50 px-2 py-1 text-xs text-slate-700">
                      {p.id}
                    </code>
                    <form
                      action={
                        standalone
                          ? deactivateStandaloneAction
                          : activateStandaloneAction
                      }
                      className="mt-2"
                    >
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        className={standalone ? "btn-ghost text-sm" : "btn-primary text-sm"}
                      >
                        {standalone
                          ? t.merchant.deactivate
                          : t.merchant.activateStandalone}
                      </button>
                    </form>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <AddPrinterForm />

      <ConnectInstructions agentToken={user.agentToken} />
    </div>
  );
}

function ConnectInstructions({ agentToken }: { agentToken: string | null }) {
  const c = t.merchant.connect;
  return (
    <section className="card p-5 space-y-4">
      <div>
        <h2 className="font-semibold">{c.title}</h2>
        <p className="text-slate-500 text-sm mt-1">{c.subtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Method 1 — PrintNode client */}
        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-800">
            {c.printnodeTitle}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">{c.printnodeHint}</p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-sm text-slate-600">
            {c.printnodeSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <a
            href="https://www.printnode.com/en/download"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost mt-3 inline-block text-sm"
          >
            printnode.com/download →
          </a>
        </div>

        {/* Method 2 — standalone script */}
        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-800">
            {c.agentTitle}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">{c.agentHint}</p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-sm text-slate-600">
            {c.agentSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          {/* Agent token */}
          <div className="mt-3">
            <div className="text-xs text-slate-500">{c.tokenLabel} (AGENT_TOKEN)</div>
            {agentToken ? (
              <>
                <code className="mt-0.5 block break-all rounded bg-slate-50 px-2 py-1 text-xs text-slate-700">
                  {agentToken}
                </code>
                <p className="mt-1 text-xs text-amber-700">{c.tokenHint}</p>
              </>
            ) : (
              <form action={generateAgentTokenAction} className="mt-1">
                <button type="submit" className="btn-ghost text-sm">
                  {c.generateToken}
                </button>
              </form>
            )}
          </div>

          <a
            href="/print-agent.zip"
            download
            className="btn-primary mt-3 inline-block text-sm"
          >
            ⬇ {c.download}
          </a>
        </div>
      </div>
    </section>
  );
}
