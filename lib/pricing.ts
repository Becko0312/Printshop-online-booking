import type { Printer } from "@prisma/client";

const DEFAULT_BW = Number(process.env.PRICE_BW_CENTS_PER_PAGE ?? 10);
const DEFAULT_COLOR = Number(process.env.PRICE_COLOR_CENTS_PER_PAGE ?? 30);

export type PriceInput = {
  pageCount: number;
  copies: number;
  color: boolean;
  printer?: Pick<Printer, "bwCentsPerPage" | "colorCentsPerPage"> | null;
};

export function perPageCents(color: boolean, printer?: PriceInput["printer"]) {
  if (color) return printer?.colorCentsPerPage ?? DEFAULT_COLOR;
  return printer?.bwCentsPerPage ?? DEFAULT_BW;
}

export function estimateCostCents(input: PriceInput): number {
  const per = perPageCents(input.color, input.printer);
  const pages = Math.max(1, Math.floor(input.pageCount)) * Math.max(1, Math.floor(input.copies));
  return per * pages;
}

// Wallet + all monetary amounts are denominated in Mongolian tögrög (₮).
// The underlying integer columns (walletCents, costCents, per-page prices) each
// hold a whole ₮ amount — 1 unit = ₮1 — so we render the integer directly with
// thousands separators and no minor unit, e.g. 10000 → "10,000₮".
export function formatMnt(amount: number): string {
  return `${Math.round(amount).toLocaleString("en-US")}₮`;
}
