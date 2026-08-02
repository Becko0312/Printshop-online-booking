# Хэвлэх Үүл — Cloud Print SaaS

Web app for Ulaanbaatar's **Cloud Print** service:

- 📤 Users upload files (PDF / PNG / JPG / DOCX) from a laptop
- 🖨 Dispatch to any of ~100 partner printers via **[PrintNode](https://www.printnode.com)**
- 💳 **Wallet** model: users buy USD credits via **[Polar.sh](https://polar.sh)** (Stripe-backed) and each print debits per page
- 🇲🇳 UI is entirely in **Mongolian (Cyrillic)**

Built with Next.js 15 (App Router) + Prisma + Tailwind.

---

## Quick start (local)

```bash
npm install
cp .env.example .env
# Edit .env — set AUTH_SECRET at minimum
npx prisma migrate dev --name init
npx tsx scripts/seed.ts     # seeds 12 sample partner shops
npm run dev
```

Open http://localhost:3000 — sign up, then visit `/dashboard`.

> The wallet top-up buttons need Polar product IDs to be set in `.env`. Without them, the print flow still works if you manually credit your account via `prisma studio`.

---

## Environment variables

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma datasource. Default: `file:./dev.db` (SQLite). For prod, use Postgres and change `provider` in `prisma/schema.prisma` |
| `AUTH_SECRET` | Long random string used to sign session JWT cookies |
| `PRINTNODE_API_KEY` | From your PrintNode dashboard |
| `POLAR_ACCESS_TOKEN` | Polar personal access token (organization scope) |
| `POLAR_WEBHOOK_SECRET` | `whsec_…` — Polar sends this when you register the webhook |
| `POLAR_PRODUCT_ID_10` / `_25` / `_50` | IDs of your $10 / $25 / $50 wallet top-up products |
| `NEXT_PUBLIC_APP_URL` | Public origin; used for Polar success/cancel URLs |
| `PRICE_BW_CENTS_PER_PAGE` | Default 10 (`$0.10`) |
| `PRICE_COLOR_CENTS_PER_PAGE` | Default 30 (`$0.30`) |

Per-printer overrides live on the `Printer` row (`bwCentsPerPage`, `colorCentsPerPage`).

---

## PrintNode setup for each partner shop

1. **In the PrintNode dashboard** — create the account and grab an API key.
2. **On each shop's PC** — install [PrintNode Client](https://www.printnode.com/en/download) and log in. Every locally-installed printer becomes visible in the API within seconds.
3. **In this app** — pre-create a `Printer` row per shop with a `name` that exactly matches what the shop machine reports (edit `scripts/seed.ts` or use `prisma studio`).
4. **Wire them up**:

   ```bash
   curl -X POST https://your-app/api/admin/sync-printers \
        -H "x-admin-token: $AUTH_SECRET"
   ```

   This walks `/printers` on PrintNode, matches by name, and stores each PrintNode `id` on the `Printer` row along with capabilities (color / duplex / online state).

5. Users can now select that printer at `/dashboard/upload`. When they submit, we base64-encode the file and POST to `/printjobs` on PrintNode. The PrintNode Client on the shop PC picks it up and hands it to the OS printer queue.

---

## Polar.sh (wallet) setup

1. Create an organization on https://polar.sh, then create three products — "$10 credits", "$25 credits", "$50 credits" — priced accordingly.
2. Grab a personal access token and drop it in `POLAR_ACCESS_TOKEN`.
3. Add the three product IDs to `.env` (`POLAR_PRODUCT_ID_10`, `_25`, `_50`).
4. **Webhook**: register `https://your-app/api/webhooks/polar` in the Polar dashboard and paste the returned `whsec_…` into `POLAR_WEBHOOK_SECRET`.

When a user clicks a top-up tier, we:

1. Create a Polar checkout session (Polar hosts the Stripe payment page).
2. Redirect the browser there.
3. On success, Polar POSTs the webhook — we verify the Standard-Webhooks HMAC and credit the user wallet inside a Prisma transaction. Idempotent by Polar order/checkout id.

You can switch this off and instead run **pay-per-print** by removing the wallet top-up UI and creating one Polar product per printjob dynamically — the checkout call in `lib/polar.ts` is unchanged, only the caller needs to swap.

---

## Data model (Prisma)

- `User` — email + bcrypt password + wallet balance in cents
- `Printer` — DB record per partner shop; `printNodeId` links to the live PrintNode printer
- `Upload` — stored under `/uploads/<uuid>-<name>` on disk
- `PrintJob` — one per submit; tracks status, page count, cost, PrintNode job id
- `WalletTx` — every credit / debit / refund; single source of truth for balance

Wallet debits happen atomically with job creation (`prisma.$transaction`). If the PrintNode dispatch fails, the wallet is refunded automatically and the job is marked `failed`.

---

## Directory map

```
app/
  page.tsx                    landing (Mongolian marketing page)
  auth/…                      sign in / sign up
  dashboard/                  main app (server components)
    upload/                   file → printer → confirm
    printers/                 browse partner shops
    jobs/                     print history
    wallet/                   balance + top-up
  api/
    auth/signout              POST — clear cookie
    admin/sync-printers       POST — pull printer list from PrintNode
    webhooks/polar            POST — credit wallet on successful checkout
lib/
  db.ts        prisma singleton
  session.ts   jose JWT-in-cookie session
  printnode.ts REST wrapper (listPrinters, createPrintJob)
  polar.ts     REST wrapper + Standard Webhooks verification
  pricing.ts   per-page pricing + wallet math
  pdf.ts       best-effort PDF page counter
  i18n.ts      Mongolian copy in one place
prisma/schema.prisma
scripts/seed.ts               12 sample partner shops
```

---

## Deploying

- **Vercel / any Node host** — SQLite works for demos; use Neon/Supabase Postgres for prod (change `provider` in `prisma/schema.prisma` to `postgresql`, run `prisma migrate deploy`).
- Uploaded files live under `/uploads` on the server disk. For serverless, swap `app/dashboard/upload/actions.ts` to write to S3 / Supabase Storage / R2, and pass a `pdf_uri` (public or signed) to PrintNode instead of base64.
- Polar webhook URL must be publicly reachable, so use a tunnel (ngrok, `polar dev`) locally.

---

## Next steps you'll want

- Email + SMS notifications when a job is `printed` (Polar/Stripe-style pattern)
- Shop-operator dashboard (their own login, mark jobs picked up)
- Estimated wait time & printer queue depth from PrintNode `/printjobs?state=…`
- Real Mongolian address autocomplete for finding the nearest shop
- Pay-per-print variant of the wallet (create a one-off product per job)
