"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { t } from "@/lib/i18n";

export type AdminResult = { error?: string; ok?: boolean; message?: string } | undefined;

function revalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/merchants");
  revalidatePath("/admin/printers");
}

// ---- Merchants -----------------------------------------------------------

const addMerchantSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
});

export async function addMerchantAction(
  _prev: AdminResult,
  formData: FormData,
): Promise<AdminResult> {
  await requireAdmin();

  const parsed = addMerchantSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
    name: String(formData.get("name") ?? "").trim() || undefined,
    phone: String(formData.get("phone") ?? "").trim() || undefined,
  });
  if (!parsed.success) return { error: t.admin.fieldRequired };

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) return { error: t.admin.emailTaken };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      name: parsed.data.name,
      phone: parsed.data.phone,
      role: "MERCHANT",
    },
  });

  revalidateAdmin();
  return { ok: true, message: t.admin.merchantAdded };
}

export async function removeMerchantAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  // Only ever delete merchant accounts through this path. Printers detach
  // automatically via the onDelete: SetNull relation.
  await prisma.user.deleteMany({ where: { id, role: "MERCHANT" } });
  revalidateAdmin();
}

// ---- Printers ------------------------------------------------------------

const addPrinterSchema = z.object({
  name: z.string().min(1).max(120),
  district: z.string().min(1).max(120),
  location: z.string().min(1).max(200),
  address: z.string().max(200).optional(),
  merchantId: z.string().optional(),
  colorSupported: z.boolean().optional(),
  duplexSupported: z.boolean().optional(),
  bwCentsPerPage: z.number().int().min(0).max(100000).optional(),
  colorCentsPerPage: z.number().int().min(0).max(100000).optional(),
});

function optInt(v: FormDataEntryValue | null): number | undefined {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

export async function addPrinterAction(
  _prev: AdminResult,
  formData: FormData,
): Promise<AdminResult> {
  await requireAdmin();

  const parsed = addPrinterSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    district: String(formData.get("district") ?? "").trim(),
    location: String(formData.get("location") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim() || undefined,
    merchantId: String(formData.get("merchantId") ?? "").trim() || undefined,
    colorSupported: formData.get("colorSupported") === "on",
    duplexSupported: formData.get("duplexSupported") === "on",
    bwCentsPerPage: optInt(formData.get("bwCentsPerPage")),
    colorCentsPerPage: optInt(formData.get("colorCentsPerPage")),
  });
  if (!parsed.success) return { error: t.admin.fieldRequired };

  // Guard against a stale/forged merchantId.
  let merchantId: string | undefined = parsed.data.merchantId;
  if (merchantId) {
    const m = await prisma.user.findFirst({
      where: { id: merchantId, role: "MERCHANT" },
      select: { id: true, email: true },
    });
    if (!m) return { error: t.admin.fieldRequired };
  }

  await prisma.printer.create({
    data: {
      name: parsed.data.name,
      district: parsed.data.district,
      location: parsed.data.location,
      address: parsed.data.address,
      merchantId: merchantId ?? null,
      colorSupported: !!parsed.data.colorSupported,
      duplexSupported: !!parsed.data.duplexSupported,
      bwCentsPerPage: parsed.data.bwCentsPerPage ?? null,
      colorCentsPerPage: parsed.data.colorCentsPerPage ?? null,
    },
  });

  revalidateAdmin();
  return { ok: true, message: t.admin.printerAdded };
}

// Remove a printer. If it has print history the FK on PrintJob blocks a hard
// delete, so we deactivate instead (keeps the historical revenue intact).
export async function removePrinterAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const jobCount = await prisma.printJob.count({ where: { printerId: id } });
  if (jobCount > 0) {
    await prisma.printer.update({ where: { id }, data: { active: false } });
  } else {
    await prisma.printer.delete({ where: { id } });
  }
  revalidateAdmin();
}

// Reassign a printer to a merchant (or unassign when merchantId is empty).
export async function assignPrinterAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("merchantId") ?? "").trim();
  if (!id) return;

  let merchantId: string | null = null;
  if (raw) {
    const m = await prisma.user.findFirst({
      where: { id: raw, role: "MERCHANT" },
      select: { id: true },
    });
    if (!m) return;
    merchantId = m.id;
  }
  await prisma.printer.update({ where: { id }, data: { merchantId } });
  revalidateAdmin();
}
