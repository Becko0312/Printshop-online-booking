"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireMerchant } from "@/lib/session";
import { t } from "@/lib/i18n";

const addPrinterSchema = z.object({
  name: z.string().min(1).max(120),
  district: z.string().min(1).max(120),
  location: z.string().min(1).max(200),
  address: z.string().max(200).optional(),
  colorSupported: z.boolean().optional(),
  duplexSupported: z.boolean().optional(),
});

export type PrinterFormResult = { error?: string; ok?: boolean } | undefined;

// A merchant registers one of their own printers. It starts inactive with no
// PrintNode id; an admin (or the sync-printers job) attaches it once the shop
// installs the PrintNode client.
export async function addMyPrinterAction(
  _prev: PrinterFormResult,
  formData: FormData,
): Promise<PrinterFormResult> {
  const user = await requireMerchant();

  const parsed = addPrinterSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    district: String(formData.get("district") ?? "").trim(),
    location: String(formData.get("location") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim() || undefined,
    colorSupported: formData.get("colorSupported") === "on",
    duplexSupported: formData.get("duplexSupported") === "on",
  });
  if (!parsed.success) return { error: t.admin.fieldRequired };

  await prisma.printer.create({
    data: {
      name: parsed.data.name,
      district: parsed.data.district,
      location: parsed.data.location,
      address: parsed.data.address,
      colorSupported: !!parsed.data.colorSupported,
      duplexSupported: !!parsed.data.duplexSupported,
      operatorEmail: user.email,
      merchantId: user.id,
      active: false, // inactive until PrintNode attaches it
    },
  });

  revalidatePath("/merchant/printers");
  revalidatePath("/merchant");
  return { ok: true };
}
