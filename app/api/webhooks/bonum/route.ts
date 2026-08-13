import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  verifyChecksum,
  parseUserIdFromTransactionId,
  type BonumWebhook,
} from "@/lib/bonum";

// Bonum Gateway callback endpoint. This one URL serves two roles, because
// Bonum uses the invoice `callback` for both:
//   • POST  — the server-to-server payment webhook (handled below).
//   • GET   — the customer's browser when they tap "Back to <merchant>" on the
//             hosted payment page. We bounce them to the wallet (see GET).
// Register this URL in the merchant portal (merchant.bonum.mn):
//   <APP_URL>/api/webhooks/bonum
//
// Bonum signs the raw POST body with HMAC-SHA256 (merchant checksum key), hex,
// in the `x-checksum-v2` header. We verify over the raw bytes, then credit the
// wallet on a successful PAYMENT. The amount paid (₮) maps to walletCents 1:1.

// Browser return from the hosted payment page. Bonum sends no status in this
// navigation, so we land on the wallet in a neutral "pending" state — the POST
// webhook is the authoritative credit and usually arrives within a second.
export async function GET() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  return NextResponse.redirect(
    new URL("/dashboard/wallet?topup=pending", base),
    303,
  );
}
export async function POST(req: Request) {
  const raw = await req.text();

  const ok = await verifyChecksum(raw, req.headers.get("x-checksum-v2"));
  if (!ok) {
    return NextResponse.json({ error: "invalid checksum" }, { status: 400 });
  }

  let event: BonumWebhook;
  try {
    event = JSON.parse(raw) as BonumWebhook;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Only a successful payment credits the wallet. Card-token events and
  // non-success statuses are acknowledged and ignored.
  if (event.type !== "PAYMENT" || event.status !== "SUCCESS") {
    return NextResponse.json({
      ok: true,
      ignored: `${event.type ?? "unknown"}/${event.status ?? "unknown"}`,
    });
  }

  const body = event.body ?? {};
  const invoiceId = body.invoiceId ?? "";
  const transactionId = body.transactionId ?? "";
  const amountMnt = Math.round(Number(body.amount ?? 0));

  if (!invoiceId || !transactionId || !amountMnt) {
    return NextResponse.json({ ok: true, ignored: "missing fields" });
  }

  const userId = parseUserIdFromTransactionId(transactionId);
  if (!userId) {
    return NextResponse.json({ ok: true, ignored: "unrecognized transactionId" });
  }

  // Idempotency: Bonum may retry delivery of the same PAYMENT event. The
  // unique bonumInvoiceId column is the real guard (see the catch below); this
  // pre-check just short-circuits the common retry case.
  const existing = await prisma.walletTx.findUnique({
    where: { bonumInvoiceId: invoiceId },
  });
  if (existing) {
    return NextResponse.json({ ok: true, alreadyCredited: true });
  }

  // Guard against a spoofed transactionId pointing at a non-existent user.
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ ok: true, ignored: "unknown user" });
  }

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { walletCents: { increment: amountMnt } },
      }),
      prisma.walletTx.create({
        data: {
          userId,
          amountCents: amountMnt,
          kind: "topup",
          description: "Bonum цэнэглэлт",
          bonumInvoiceId: invoiceId,
          bonumTransactionId: transactionId,
        },
      }),
    ]);
  } catch (e) {
    // Unique-constraint violation on bonumInvoiceId → a concurrent retry already
    // credited this invoice. Treat as success.
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique constraint") || msg.includes("P2002")) {
      return NextResponse.json({ ok: true, alreadyCredited: true });
    }
    throw e;
  }

  return NextResponse.json({ ok: true });
}
