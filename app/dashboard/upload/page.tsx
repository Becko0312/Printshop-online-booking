import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import UploadClient from "./UploadClient";

export default async function UploadPage() {
  const user = await requireUser();
  const printers = await prisma.printer.findMany({
    where: { active: true },
    orderBy: [{ district: "asc" }, { name: "asc" }],
  });
  return (
    <UploadClient
      walletCents={user.walletCents}
      printers={printers.map((p) => ({
        id: p.id,
        name: p.name,
        district: p.district,
        location: p.location,
        colorSupported: p.colorSupported,
        duplexSupported: p.duplexSupported,
        bwCentsPerPage: p.bwCentsPerPage,
        colorCentsPerPage: p.colorCentsPerPage,
        connected: p.printNodeId != null,
        telegramReady: !!(p.telegramBotToken && p.telegramChatId),
      }))}
    />
  );
}
