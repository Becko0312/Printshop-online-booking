"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { createCheckoutSession, getTopUpTiers } from "@/lib/polar";

export async function startTopUpAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const productId = String(formData.get("productId") ?? "");
  const amountCents = Number(formData.get("amountCents") ?? 0);
  if (!productId || !amountCents) {
    throw new Error("Buруу цэнэглэх багц.");
  }
  const tier = getTopUpTiers().find((t) => t.productId === productId);
  if (!tier || tier.amountCents !== amountCents) {
    throw new Error("Багц олдсонгүй.");
  }

  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const checkout = await createCheckoutSession({
    productId,
    successUrl: `${base}/dashboard/wallet?topup=success`,
    cancelUrl: `${base}/dashboard/wallet?topup=canceled`,
    customerEmail: user.email,
    metadata: {
      userId: user.id,
      amountCents: String(amountCents),
    },
  });

  redirect(checkout.url);
}

// Redeem a promo code: validates the code, then atomically records the
// redemption, credits the wallet, and writes a wallet transaction. Errors are
// surfaced back to the wallet page via the `?promo=` query param so the flow
// stays a plain server-action form (no client state needed).
export async function redeemPromoAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();

  if (!code) redirect("/dashboard/wallet?promo=empty");

  const outcome = await prisma
    .$transaction(async (tx) => {
      const promo = await tx.promoCode.findUnique({ where: { code } });
      if (!promo || !promo.active) throw new Error("INVALID");
      if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) {
        throw new Error("EXPIRED");
      }
      if (
        promo.maxRedemptions != null &&
        promo.redeemedCount >= promo.maxRedemptions
      ) {
        throw new Error("EXHAUSTED");
      }

      const already = await tx.promoRedemption.findUnique({
        where: { promoCodeId_userId: { promoCodeId: promo.id, userId: user.id } },
      });
      if (already) throw new Error("USED");

      // The unique (promoCodeId, userId) constraint is the real guard against a
      // double-submit race; the check above just gives a friendlier message.
      await tx.promoRedemption.create({
        data: {
          promoCodeId: promo.id,
          userId: user.id,
          amountCents: promo.valueCents,
        },
      });
      await tx.promoCode.update({
        where: { id: promo.id },
        data: { redeemedCount: { increment: 1 } },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { walletCents: { increment: promo.valueCents } },
      });
      await tx.walletTx.create({
        data: {
          userId: user.id,
          amountCents: promo.valueCents,
          kind: "promo",
          description: `Промо код: ${promo.code}`,
        },
      });
      return promo.valueCents;
    })
    .catch((e: unknown) => {
      const known = ["INVALID", "EXPIRED", "EXHAUSTED", "USED"];
      const msg = e instanceof Error ? e.message : "";
      // Unique-constraint violation from a race → treat as already used.
      if (msg.includes("Unique constraint") || msg.includes("P2002")) return "USED";
      return known.includes(msg) ? msg : "ERROR";
    });

  if (typeof outcome === "number") {
    revalidatePath("/dashboard/wallet");
    revalidatePath("/dashboard");
    redirect(`/dashboard/wallet?promo=success&amt=${outcome}`);
  }
  redirect(`/dashboard/wallet?promo=${outcome.toLowerCase()}`);
}
