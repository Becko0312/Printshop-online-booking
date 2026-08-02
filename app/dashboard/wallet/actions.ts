"use server";

import { redirect } from "next/navigation";
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
