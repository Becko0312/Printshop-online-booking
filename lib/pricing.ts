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

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
