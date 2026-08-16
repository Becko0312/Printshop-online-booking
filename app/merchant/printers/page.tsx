import { prisma } from "@/lib/db";
import { requireMerchant } from "@/lib/session";
import { t } from "@/lib/i18n";
import AddPrinterForm from "./AddPrinterForm";
import EditPrinterCard from "./EditPrinterCard";

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
          {printers.map((p) => (
            <EditPrinterCard
              key={p.id}
              printer={{
                id: p.id,
                name: p.name,
                district: p.district,
                location: p.location,
                address: p.address,
                colorSupported: p.colorSupported,
                duplexSupported: p.duplexSupported,
                active: p.active,
                printNodeId: p.printNodeId,
                telegramBotToken: p.telegramBotToken,
                telegramChatId: p.telegramChatId,
              }}
            />
          ))}
        </ul>
      )}

      <AddPrinterForm />
    </div>
  );
}
