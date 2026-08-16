import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authMerchantByToken } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/agent/jobs/[id]
// Body: { status: "printed" | "failed", error?: string }
//
// The agent reports the outcome of a claimed job. On failure we refund the
// customer's wallet (the job never actually printed), mirroring the PrintNode
// dispatch-failure behaviour. Both transitions are idempotent: they only act
// while the job is still in a pre-terminal state (queued/sent).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const merchant = await authMerchantByToken(req);
  if (!merchant) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    status?: string;
    error?: string;
  };

  const job = await prisma.printJob.findUnique({
    where: { id },
    include: { printer: { select: { merchantId: true } } },
  });
  if (!job || job.printer?.merchantId !== merchant.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (body.status === "printed") {
    await prisma.printJob.updateMany({
      where: { id, status: { in: ["queued", "sent"] } },
      data: { status: "printed" },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.status === "failed") {
    const errorMessage = body.error ? String(body.error).slice(0, 500) : null;
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.printJob.findUnique({ where: { id } });
      // Only refund once, and only if the job hasn't already settled.
      if (!fresh || (fresh.status !== "queued" && fresh.status !== "sent")) {
        return;
      }
      await tx.printJob.update({
        where: { id },
        data: { status: "failed", errorMessage },
      });
      await tx.user.update({
        where: { id: fresh.userId },
        data: { walletCents: { increment: fresh.costCents } },
      });
      await tx.walletTx.create({
        data: {
          userId: fresh.userId,
          amountCents: fresh.costCents,
          kind: "refund",
          description: "Буцаалт: хэвлэлт амжилтгүй (agent)",
        },
      });
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown status" }, { status: 400 });
}
