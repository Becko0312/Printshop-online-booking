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
      checkout_id?: string;
      metadata?: Record<string, string> | null;
      amount?: number;
    };
  };

  // Fire on any "paid" order/checkout event. Polar sends several event types
  // — we accept both order.paid and checkout.updated with status paid.
  const type = e.type ?? "";
  const isPaid =
    type === "order.paid" ||
    type === "order.created" ||
    type === "checkout.completed" ||
    type === "checkout.updated";
  if (!isPaid) return NextResponse.json({ ok: true, ignored: type });

  const meta = e.data?.metadata ?? {};
  const userId = meta.userId;
  const amountCents = Number(meta.amountCents ?? e.data?.amount ?? 0);
  if (!userId || !amountCents) {
    return NextResponse.json({ ok: true, ignored: "missing metadata" });
  }

  const polarRef = e.data?.id ?? e.data?.checkout_id ?? "";
  // Idempotency: skip if we've already credited this Polar id.
  if (polarRef) {
    const existing = await prisma.walletTx.findFirst({
      where: {
        userId,
        OR: [{ polarOrderId: polarRef }, { polarCheckoutId: polarRef }],
      },
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
        description: `Polar цэнэглэлт (${type})`,
        polarOrderId: type.startsWith("order") ? polarRef : undefined,
        polarCheckoutId: type.startsWith("checkout") ? polarRef : undefined,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
