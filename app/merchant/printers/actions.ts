"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireMerchant } from "@/lib/session";
import { newAgentToken } from "@/lib/agent";
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

// Generate the merchant's standalone-agent token if they don't have one yet.
// Idempotent: keeps the existing token if already set.
export async function generateAgentTokenAction(): Promise<void> {
  const user = await requireMerchant();
  if (!user.agentToken) {
    await prisma.user.update({
      where: { id: user.id },
      data: { agentToken: newAgentToken() },
    });
  }
  revalidatePath("/merchant/printers");
}

// Activate one of the merchant's printers for the standalone agent. The printer
// keeps no printNodeId; being active + printNodeId-less marks it agent-driven,
// so customer print jobs stay "queued" for the local agent to claim.
export async function activateStandaloneAction(formData: FormData): Promise<void> {
  const user = await requireMerchant();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  // Scope to a printer this merchant owns; never touch a PrintNode-linked one.
  await prisma.printer.updateMany({
    where: { id, merchantId: user.id, printNodeId: null },
    data: { active: true },
  });
  revalidatePath("/merchant/printers");
  revalidatePath("/merchant");
}

// Deactivate an agent-driven printer (e.g. shop is closing / agent offline) so
// customers can no longer select it.
export async function deactivateStandaloneAction(formData: FormData): Promise<void> {
  const user = await requireMerchant();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.printer.updateMany({
    where: { id, merchantId: user.id, printNodeId: null },
    data: { active: false },
  });
  revalidatePath("/merchant/printers");
  revalidatePath("/merchant");
}
