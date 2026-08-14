import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { agentAuthorized } from "@/lib/agent";

// POST /api/agent/jobs/:id  { status: "printed" | "failed", error?: string }
//
// The local agent reports the outcome after printing. On failure we refund the
// wallet, mirroring the PrintNode dispatch-failure path. Idempotent: only a job
// still in the claimed "sent" state transitions here, so retries are no-ops.
//
// Auth: Authorization: Bearer <PRINT_AGENT_TOKEN>
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!agentAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  let body: { status?: string; error?: string };
  try {
    body = (await req.json()) as { status?: string; error?: string };
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const outcome = body.status === "printed" ? "printed" : "failed";

  const job = await prisma.printJob.findUnique({ where: { id } });
  if (!job) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (job.deliveryMethod !== "agent") {
    return NextResponse.json({ error: "not an agent job" }, { status: 400 });
  }
  // Only a claimed job transitions. Anything else (already printed/failed) is a
  // retry — acknowledge without re-applying (avoids a double refund).
  if (job.status !== "sent") {
    return NextResponse.json({ ok: true, alreadyFinal: job.status });
  }

  if (outcome === "printed") {
    await prisma.printJob.update({
      where: { id: job.id },
      data: { status: "printed" },
    });
    return NextResponse.json({ ok: true, status: "printed" });
  }

  // Failed → mark failed and refund the wallet.
  const message = (body.error ?? "Агент хэвлэж чадсангүй").slice(0, 500);
  await prisma.$transaction([
    prisma.printJob.update({
      where: { id: job.id },
      data: { status: "failed", errorMessage: message },
    }),
    prisma.user.update({
      where: { id: job.userId },
      data: { walletCents: { increment: job.costCents } },
    }),
    prisma.walletTx.create({
      data: {
        userId: job.userId,
        amountCents: job.costCents,
        kind: "refund",
        description: "Буцаалт: локал агент хэвлэлт амжилтгүй",
      },
    }),
  ]);
  return NextResponse.json({ ok: true, status: "failed", refunded: job.costCents });
}
