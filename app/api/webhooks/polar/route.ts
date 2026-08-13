import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPolarWebhook } from "@/lib/polar";

// Polar webhook. Configure endpoint:  <APP_URL>/api/webhooks/polar
//
// We credit the user wallet when an order/checkout is completed. The user id
// and requested cents are round-tripped through checkout metadata.
export async function POST(req: Request) {
  const raw = await req.text();
  const ok = await verifyPolarWebhook(raw, req.headers);
  if (!ok) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  let event: unknown;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const e = event as {
    type?: string;
    data?: {
      id?: string;
      metadata?: Record<string, string> | null;
    };
  };

  // Credit the wallet ONLY on `order.paid` — the single definitive "money
  // received" event for a one-time purchase. A purchase also emits
  // order.created / order.updated / checkout.updated, each with a *different*
  // id, so acting on more than one would bypass the id-based idempotency guard
  // below and credit the wallet multiple times.
  const type = e.type ?? "";
  if (type !== "order.paid") {
    return NextResponse.json({ ok: true, ignored: type || "unknown" });
  }

  // Polar copies the checkout `metadata` onto the resulting order, so userId
  // and the exact wallet credit round-trip through here.
  const meta = e.data?.metadata ?? {};
  const userId = meta.userId;
  const amountCents = Number(meta.amountCents ?? 0);
  if (!userId || !amountCents) {
    return NextResponse.json({ ok: true, ignored: "missing metadata" });
  }

  const orderId = e.data?.id ?? "";
  // Idempotency: Polar may retry delivery of the same order.paid event.
  if (orderId) {
    const existing = await prisma.walletTx.findFirst({
      where: { userId, polarOrderId: orderId },
    });
    if (existing) return NextResponse.json({ ok: true, alreadyCredited: true });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { walletCents: { increment: amountCents } },
    }),
    prisma.walletTx.create({
      data: {
        userId,
        amountCents,
        kind: "topup",
        description: "Polar цэнэглэлт",
        polarOrderId: orderId || undefined,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
