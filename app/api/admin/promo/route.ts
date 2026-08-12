import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

// Admin endpoint to mint promo codes that grant free wallet credit.
//
// Auth: header `x-admin-token: $AUTH_SECRET` (same scheme as sync-printers).
//
// POST body (all optional except an amount):
//   { code?, valueCents?, valueUsd?, maxRedemptions?, expiresAt?, note? }
// - code           : explicit code; if omitted a random one is generated
// - valueCents     : credit granted per redemption (or use valueUsd)
// - valueUsd       : convenience — dollars, converted to cents
// - maxRedemptions : total cap across all users; omit for unlimited
// - expiresAt      : ISO date string; omit for no expiry
//
// GET (same auth) lists existing codes with redemption counts.

function makeCode(): string {
  // Unambiguous alphabet (no 0/O/1/I) → easy to read/type.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const raw = randomBytes(8);
  let out = "";
  for (const b of raw) out += alphabet[b % alphabet.length];
  return `FREE-${out.slice(0, 4)}-${out.slice(4, 8)}`;
}

function authed(req: Request): boolean {
  const token = req.headers.get("x-admin-token");
  return !!token && token === process.env.AUTH_SECRET;
}

export async function POST(req: Request) {
  if (!authed(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    code?: string;
    valueCents?: number;
    valueUsd?: number;
    maxRedemptions?: number;
    expiresAt?: string;
    note?: string;
  };

  const valueCents =
    body.valueCents ??
    (body.valueUsd != null ? Math.round(body.valueUsd * 100) : undefined);
  if (!valueCents || valueCents <= 0) {
    return NextResponse.json(
      { error: "valueCents (or valueUsd) is required and must be > 0" },
      { status: 400 },
    );
  }

  const code = (body.code ?? makeCode()).trim().toUpperCase();
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ error: "invalid expiresAt" }, { status: 400 });
  }

  try {
    const promo = await prisma.promoCode.create({
      data: {
        code,
        valueCents,
        maxRedemptions: body.maxRedemptions ?? null,
        expiresAt,
        note: body.note ?? null,
      },
    });
    return NextResponse.json({ ok: true, promo });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    // Unique violation on code
    if (msg.includes("Unique constraint") || msg.includes("P2002")) {
      return NextResponse.json(
        { error: `code "${code}" already exists` },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: Request) {
  if (!authed(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const codes = await prisma.promoCode.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { redemptions: true } } },
  });
  return NextResponse.json({ ok: true, codes });
}
