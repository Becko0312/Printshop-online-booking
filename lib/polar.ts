// Polar.sh integration — checkout sessions for wallet top-ups.
// Docs: https://docs.polar.sh
//
// We hit the Polar REST API directly to keep dependencies light. If you prefer
// the official SDK (@polar-sh/sdk) it can be dropped in with the same env vars.

const POLAR_BASE = "https://api.polar.sh";

function token(): string {
  const t = process.env.POLAR_ACCESS_TOKEN;
  if (!t) throw new Error("POLAR_ACCESS_TOKEN is not configured.");
  return t;
}

export type CreateCheckoutInput = {
  productId: string;
  successUrl: string;
  cancelUrl?: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
};

export type PolarCheckout = {
  id: string;
  url: string;
  status?: string;
};

export async function createCheckoutSession(
  input: CreateCheckoutInput,
): Promise<PolarCheckout> {
  const res = await fetch(POLAR_BASE + "/v1/checkouts/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
    },
    body: JSON.stringify({
      product_id: input.productId,
      success_url: input.successUrl,
      customer_email: input.customerEmail,
      metadata: input.metadata,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Polar checkout error ${res.status}: ${text}`);
  }
  const json = (await res.json()) as { id: string; url: string; status?: string };
  return { id: json.id, url: json.url, status: json.status };
}

// Verify a Polar webhook using the shared secret + standard HMAC.
// Polar uses Standard Webhooks (https://www.standardwebhooks.com/).
export async function verifyPolarWebhook(
  rawBody: string,
  headers: Headers,
): Promise<boolean> {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) return false;

  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signature = headers.get("webhook-signature");
  if (!id || !timestamp || !signature) return false;

  const signedPayload = `${id}.${timestamp}.${rawBody}`;
  // Standard Webhooks secrets are prefixed with "whsec_" + base64 secret material.
  const keyBytes = base64Decode(secret.replace(/^whsec_/, ""));
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength) as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload),
  );
  const expected = "v1," + base64Encode(new Uint8Array(sigBytes));
  // signature header may contain multiple space-separated versions
  return signature.split(" ").some((s) => timingSafeEq(s, expected));
}

function base64Decode(s: string): Uint8Array {
  return Uint8Array.from(Buffer.from(s, "base64"));
}
function base64Encode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}
function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

// Wallet top-up tiers surfaced in the UI. Amount is USD cents credited to the
// wallet. `productId` must exist in your Polar organization.
export type TopUpTier = {
  label: string;
  amountCents: number;
  productId: string | undefined;
};

export function getTopUpTiers(): TopUpTier[] {
  return [
    {
      label: "$10",
      amountCents: 1000,
      productId: process.env.POLAR_PRODUCT_ID_10,
    },
    {
      label: "$25",
      amountCents: 2500,
      productId: process.env.POLAR_PRODUCT_ID_25,
    },
    {
      label: "$50",
      amountCents: 5000,
      productId: process.env.POLAR_PRODUCT_ID_50,
    },
  ];
}
