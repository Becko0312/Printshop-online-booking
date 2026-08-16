import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authMerchantByToken, appBaseUrl } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/agent/jobs?printer=<printerId>
//
// Returns queued print jobs for the given printer (which must belong to the
// authenticated merchant) and atomically claims them (queued -> sent) so a
// second poll — or a second PC bound to the same printer — never prints the
// same job twice. The agent then prints each and reports back via
// POST /api/agent/jobs/[id].
export async function GET(req: Request) {
  const merchant = await authMerchantByToken(req);
  if (!merchant) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const printerKey = new URL(req.url).searchParams.get("printer");
  if (!printerKey) {
    return NextResponse.json(
      { error: "missing ?printer=<printerId>" },
      { status: 400 },
    );
  }

  // Scope strictly to a printer this merchant owns.
  const printer = await prisma.printer.findFirst({
    where: { id: printerKey, merchantId: merchant.id },
  });
  if (!printer) {
    return NextResponse.json({ jobs: [] });
  }

  const queued = await prisma.printJob.findMany({
    where: { printerId: printer.id, status: "queued" },
    include: { upload: { select: { filename: true } } },
    orderBy: { createdAt: "asc" },
    take: 5,
  });

  // Claim each job individually: updateMany with a status guard is atomic, so
  // only one caller wins the queued -> sent transition.
  const base = appBaseUrl(req);
  const claimed: unknown[] = [];
  for (const j of queued) {
    const res = await prisma.printJob.updateMany({
      where: { id: j.id, status: "queued" },
      data: { status: "sent" },
    });
    if (res.count === 1) {
      claimed.push({
        id: j.id,
        filename: j.upload.filename,
        fileUrl: `${base}/api/agent/jobs/${j.id}/file`,
        copies: j.copies,
        color: j.color,
        duplex: j.duplex,
        printer: printer.name,
      });
    }
  }

  return NextResponse.json({ jobs: claimed });
}
