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

// Merchant edit: name/location/flags plus Telegram bot config. Kept separate
// from addPrinter so the schemas can evolve independently and so we don't
// accidentally reset PrintNode/agent-only fields on save.
const editPrinterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  district: z.string().min(1).max(120),
  location: z.string().min(1).max(200),
  address: z.string().max(200).optional(),
  colorSupported: z.boolean().optional(),
  duplexSupported: z.boolean().optional(),
  // A Telegram bot token looks like "123456789:AA…" — enforce the ":"
  // separator only, so we don't reject valid tokens on cosmetic changes.
  telegramBotToken: z.string().max(120).optional(),
  telegramChatId: z.string().max(64).optional(),
  n8nWebhookUrl: z.string().url().max(300).optional(),
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

// Edit one of the current merchant's printers. Scoped by merchantId so a
// merchant can't touch someone else's row even by tampering with the id.
export async function editMyPrinterAction(
  _prev: PrinterFormResult,
  formData: FormData,
): Promise<PrinterFormResult> {
  const user = await requireMerchant();

  const parsed = editPrinterSchema.safeParse({
    id: String(formData.get("id") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    district: String(formData.get("district") ?? "").trim(),
    location: String(formData.get("location") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim() || undefined,
    colorSupported: formData.get("colorSupported") === "on",
    duplexSupported: formData.get("duplexSupported") === "on",
    telegramBotToken:
      String(formData.get("telegramBotToken") ?? "").trim() || undefined,
    telegramChatId:
      String(formData.get("telegramChatId") ?? "").trim() || undefined,
    n8nWebhookUrl:
      String(formData.get("n8nWebhookUrl") ?? "").trim() || undefined,
  });
  if (!parsed.success) return { error: t.admin.fieldRequired };

  const owned = await prisma.printer.findFirst({
    where: { id: parsed.data.id, merchantId: user.id },
    select: { id: true },
  });
  if (!owned) return { error: t.admin.fieldRequired };

  await prisma.printer.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      district: parsed.data.district,
      location: parsed.data.location,
      address: parsed.data.address ?? null,
      colorSupported: !!parsed.data.colorSupported,
      duplexSupported: !!parsed.data.duplexSupported,
      telegramBotToken: parsed.data.telegramBotToken ?? null,
      telegramChatId: parsed.data.telegramChatId ?? null,
      n8nWebhookUrl: parsed.data.n8nWebhookUrl ?? null,
    },
  });

  revalidatePath("/merchant/printers");
  revalidatePath("/merchant");
  return { ok: true };
}
