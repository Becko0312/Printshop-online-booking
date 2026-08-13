// Bonum Gateway integration — hosted-invoice checkout for wallet top-ups.
//
// Docs:
//   https://psp.bonum.mn/bonum-gateway-apis.html
//   https://documenter.getpostman.com/view/6164222/2sB2cYbzu8
//
// Flow:
//   1. auth()          → exchange the terminal AppSecret for a short-lived
//                        access token (valid ~1800s, cached in-process).
//   2. createInvoice() → returns { invoiceId, followUpLink }; we redirect the
//                        customer to followUpLink to pay (card / QPay / etc.).
//   3. Bonum calls our webhook (POST /api/webhooks/bonum) on payment. We verify
//      the `x-checksum-v2` HMAC and credit the wallet. See verifyChecksum().
//
// All amounts are in MNT (₮). The wallet stores ₮ as an integer, 1 unit = ₮1,
// so a paid amount maps to walletCents 1:1 (see the webhook route).

type BonumEnv = "production" | "test";

function env(): BonumEnv {
  return process.env.BONUM_ENV === "test" ? "test" : "production";
}

function baseUrl(): string {
  return env() === "test" ? "https://testapi.bonum.mn" : "https://apis.bonum.mn";
}

function terminalId(): string {
  const v = process.env.BONUM_TERMINAL_ID;
  if (!v) throw new Error("BONUM_TERMINAL_ID is not configured.");
  return v;
}

function appSecret(): string {
  const v = process.env.BONUM_APP_SECRET;
  if (!v) throw new Error("BONUM_APP_SECRET is not configured.");
  return v;
}

function checksumKey(): string {
  const v = process.env.BONUM_CHECKSUM_KEY;
  if (!v) throw new Error("BONUM_CHECKSUM_KEY is not configured.");
  return v;
}

export function isConfigured(): boolean {
  return Boolean(
    process.env.BONUM_TERMINAL_ID &&
      process.env.BONUM_APP_SECRET &&
      process.env.BONUM_CHECKSUM_KEY,
  );
}

// -----------------------------------------------------------------------------
// Auth — cache the access token in module scope. Serverless instances are
// short-lived, so this is a best-effort cache; on a cold start we just re-auth.
// -----------------------------------------------------------------------------
let cachedToken: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.token;
  }

  const res = await fetch(baseUrl() + "/bonum-gateway/ecommerce/auth/create", {
    method: "GET",
    headers: {
      Authorization: `AppSecret ${appSecret()}`,
      "X-TERMINAL-ID": terminalId(),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bonum auth error ${res.status}: ${text}`);
  }
  const json = (await res.json()) as {
    accessToken?: string;
    // API returns seconds-to-expiry; fall back to 1800s per the docs.
    expiresIn?: number;
  };
  if (!json.accessToken) {
    throw new Error("Bonum auth: no accessToken in response.");
  }
  const ttlMs = (json.expiresIn ?? 1800) * 1000;
  cachedToken = { token: json.accessToken, expiresAt: now + ttlMs };
  return json.accessToken;
}

// -----------------------------------------------------------------------------
// Create invoice
// -----------------------------------------------------------------------------
export type CreateInvoiceInput = {
  // Amount in MNT (₮). Bonum expects a numeric amount.
  amount: number;
  // Our own reference, echoed back on the webhook as body.transactionId.
  transactionId: string;
  // Where Bonum sends the payment result (our webhook endpoint).
  callbackUrl: string;
  description?: string;
};

export type BonumInvoice = {
  invoiceId: string;
  // Hosted payment page — redirect the customer here.
  followUpLink: string;
};

export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<BonumInvoice> {
  const res = await fetch(baseUrl() + "/bonum-gateway/ecommerce/invoices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await accessToken()}`,
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: "MNT",
      transactionId: input.transactionId,
      callback: input.callbackUrl,
      description: input.description,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bonum invoice error ${res.status}: ${text}`);
  }
  const json = (await res.json()) as {
    invoiceId?: string;
    followUpLink?: string;
  };
  if (!json.invoiceId || !json.followUpLink) {
    throw new Error(
      `Bonum invoice: missing invoiceId/followUpLink in response: ${JSON.stringify(json)}`,
    );
  }
  return { invoiceId: json.invoiceId, followUpLink: json.followUpLink };
}

// -----------------------------------------------------------------------------
// Webhook checksum verification.
//
// Bonum signs the webhook by computing HMAC-SHA256 over the exact raw request
// body using the merchant checksum key, hex-encoded, delivered in the
// `x-checksum-v2` header. We recompute over the raw bytes (never re-serialize
// the parsed JSON — key order / whitespace would differ) and compare.
// -----------------------------------------------------------------------------
export async function verifyChecksum(
  rawBody: string,
  headerValue: string | null,
): Promise<boolean> {
  if (!headerValue) return false;
  let key: string;
  try {
    key = checksumKey();
  } catch {
    return false;
  }

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(rawBody),
  );
  const expected = toHex(new Uint8Array(sig));
  return timingSafeEq(expected.toLowerCase(), headerValue.trim().toLowerCase());
}

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

// -----------------------------------------------------------------------------
// Webhook payload shape (see docs). We only act on a successful PAYMENT.
// -----------------------------------------------------------------------------
export type BonumWebhook = {
  type?: string; // "PAYMENT" | "CARD-TOKEN" | ...
  status?: string; // "SUCCESS" | "FAILED" | ...
  body?: {
    amount?: number;
    currency?: string;
    completedAt?: string;
    invoiceId?: string;
    transactionId?: string;
  };
};

// -----------------------------------------------------------------------------
// Wallet top-up tiers surfaced in the UI. `amountMnt` is both charged at Bonum
// and credited to the wallet (1 wallet unit = ₮1).
// -----------------------------------------------------------------------------
export type BonumTier = { label: string; amountMnt: number };

export function getBonumTiers(): BonumTier[] {
  return [
    { label: "₮10,000", amountMnt: 10_000 },
    { label: "₮30,000", amountMnt: 30_000 },
    { label: "₮50,000", amountMnt: 50_000 },
    { label: "₮100,000", amountMnt: 100_000 },
  ];
}

// Build the reference we hand to Bonum as `transactionId`. We embed the user id
// so the webhook can resolve the account without a pre-created pending row.
// cuid ids are lowercase alphanumeric (no dashes), so `-` is a safe delimiter.
export function buildTransactionId(userId: string, nonce: string): string {
  return `tu-${userId}-${nonce}`;
}

export function parseUserIdFromTransactionId(txId: string): string | null {
  const m = /^tu-([^-]+)-/.exec(txId);
  return m ? m[1] : null;
}
