"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { estimateCostCents, perPageCents } from "@/lib/pricing";
import { createPrintJob } from "@/lib/printnode";
import { sendDocument as sendTelegramDocument } from "@/lib/telegram";
import {
  saveUpload,
  contentForPrintNode,
  readUploadBytes,
} from "@/lib/storage";
import { normalizeUpload, UnsupportedFormatError } from "@/lib/normalize";

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export type UploadResult =
  | { ok: true; uploadId: string; pageCount: number | null; filename: string; mimeType: string }
  | { ok: false; error: string };

export async function uploadFileAction(formData: FormData): Promise<UploadResult> {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Файл сонгогдоогүй байна." };
  if (file.size === 0) return { ok: false, error: "Файл хоосон байна." };
  if (file.size > MAX_BYTES) return { ok: false, error: "Файлын хэмжээ 100MB-ээс их байна." };
  if (!ALLOWED.has(file.type)) {
    return { ok: false, error: `Дэмжигдэхгүй файлын төрөл: ${file.type || "тодорхойгүй"}` };
  }

  const original = Buffer.from(await file.arrayBuffer());

  // Normalize to PDF at the source: images and DOCX become PDF so every
  // downstream path (PrintNode + local agent, on any OS) prints one reliable
  // format. See lib/normalize.ts.
  let norm;
  try {
    norm = await normalizeUpload(original, file.name, file.type);
  } catch (e) {
    if (e instanceof UnsupportedFormatError) {
      return {
        ok: false,
        error:
          "Word (.docx) файлыг шууд хэвлэх боломжгүй байна. PDF болгож хөрвүүлээд оруулна уу.",
      };
    }
    const msg = e instanceof Error ? e.message : "Файл боловсруулахад алдаа гарлаа.";
    return { ok: false, error: `Хөрвүүлэлт амжилтгүй: ${msg}` };
  }

  let stored;
  try {
    stored = await saveUpload(norm.buf, norm.filename, norm.mimeType);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Файл хадгалахад алдаа гарлаа.";
    return { ok: false, error: msg };
  }

  const upload = await prisma.upload.create({
    data: {
      userId: user.id,
      filename: norm.filename,
      storedPath: stored.storedPath,
      mimeType: norm.mimeType,
      sizeBytes: norm.buf.length,
      pageCount: norm.pageCount ?? undefined,
    },
  });

  return {
    ok: true,
    uploadId: upload.id,
    pageCount: norm.pageCount,
    filename: upload.filename,
    mimeType: upload.mimeType,
  };
}

const submitSchema = z.object({
  uploadId: z.string().min(1),
  printerId: z.string().min(1),
  copies: z.coerce.number().int().min(1).max(50),
  color: z.coerce.boolean().optional(),
  duplex: z.coerce.boolean().optional(),
  pageCount: z.coerce.number().int().min(1).max(5000),
  // "printnode" → dispatch to the PrintNode cloud;
  // "agent"     → leave queued for a local agent (n8n) on the shop PC to pull;
  // "telegram"  → post the file to the printer's Telegram bot for a merchant-
  //               side n8n workflow to print.
  method: z.enum(["printnode", "agent", "telegram"]).default("printnode"),
});

export type SubmitResult = { ok: true; jobId: string } | { ok: false; error: string };

export async function submitPrintJobAction(
  _prev: SubmitResult | undefined,
  formData: FormData,
): Promise<SubmitResult> {
  const user = await requireUser();
  const parsed = submitSchema.safeParse({
    uploadId: formData.get("uploadId"),
    printerId: formData.get("printerId"),
    copies: formData.get("copies"),
    color: formData.get("color") === "on" || formData.get("color") === "true",
    duplex: formData.get("duplex") === "on" || formData.get("duplex") === "true",
    pageCount: formData.get("pageCount"),
    method: formData.get("method") ?? "printnode",
  });
  if (!parsed.success) return { ok: false, error: "Тохиргоо буруу байна." };

  const upload = await prisma.upload.findFirst({
    where: { id: parsed.data.uploadId, userId: user.id },
  });
  if (!upload) return { ok: false, error: "Файл олдсонгүй." };

  const printer = await prisma.printer.findUnique({ where: { id: parsed.data.printerId } });
  if (!printer || !printer.active) return { ok: false, error: "Хэвлэгч идэвхгүй байна." };
  if (parsed.data.color && !printer.colorSupported) {
    return { ok: false, error: "Энэ хэвлэгч өнгөт хэвлэлт дэмждэггүй." };
  }

  const costCents = estimateCostCents({
    pageCount: parsed.data.pageCount,
    copies: parsed.data.copies,
    color: !!parsed.data.color,
    printer,
  });

  // Atomically: debit wallet, create job, create tx. Wrap for consistency.
  const job = await prisma.$transaction(async (tx) => {
    const fresh = await tx.user.findUnique({ where: { id: user.id } });
    if (!fresh) throw new Error("USER_MISSING");
    if (fresh.walletCents < costCents) throw new Error("INSUFFICIENT_FUNDS");

    await tx.user.update({
      where: { id: user.id },
      data: { walletCents: { decrement: costCents } },
    });
    const job = await tx.printJob.create({
      data: {
        userId: user.id,
        uploadId: upload.id,
        printerId: printer.id,
        copies: parsed.data.copies,
        color: !!parsed.data.color,
        duplex: !!parsed.data.duplex,
        pageCount: parsed.data.pageCount,
        costCents,
        status: "queued",
        deliveryMethod: parsed.data.method,
      },
    });
    await tx.walletTx.create({
      data: {
        userId: user.id,
        amountCents: -costCents,
        kind: "spend",
        description: `Хэвлэлт: ${upload.filename} × ${parsed.data.copies}`,
      },
    });
    return job;
  }).catch((e) => {
    if (e instanceof Error && e.message === "INSUFFICIENT_FUNDS") {
      return "INSUFFICIENT_FUNDS" as const;
    }
    throw e;
  });

  if (job === "INSUFFICIENT_FUNDS") {
    return { ok: false, error: "Үлдэгдэл хүрэлцэхгүй. Хэтэвчээ цэнэглэнэ үү." };
  }

  // Local-agent delivery: nothing to dispatch here — the job stays "queued"
  // and the shop-PC agent (n8n) pulls it via /api/agent/jobs, prints, and
  // reports back. Wallet is already debited; the agent refunds on failure.
  if (parsed.data.method === "agent") {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/jobs");
    return { ok: true, jobId: job.id };
  }

  // Telegram delivery: post the file to the merchant's bot. The shop-side n8n
  // workflow watches that chat and prints. Refund on dispatch failure since
  // the job never reached the shop.
  if (parsed.data.method === "telegram") {
    try {
      if (!printer.telegramBotToken || !printer.telegramChatId) {
        throw new Error("Хэвлэгч Telegram-д тохируулагдаагүй.");
      }
      const bytes = await readUploadBytes(upload.storedPath);
      await sendTelegramDocument({
        botToken: printer.telegramBotToken,
        chatId: printer.telegramChatId,
        filename: upload.filename,
        mimeType: upload.mimeType,
        bytes,
        // Machine-readable caption so the n8n workflow can pick out print
        // options without needing a separate API call back to us.
        caption: [
          `job:${job.id}`,
          `copies:${parsed.data.copies}`,
          `color:${parsed.data.color ? 1 : 0}`,
          `duplex:${parsed.data.duplex ? 1 : 0}`,
        ].join(" "),
      });
      await prisma.printJob.update({
        where: { id: job.id },
        data: { status: "sent" },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Тодорхойгүй алдаа";
      await prisma.$transaction([
        prisma.printJob.update({
          where: { id: job.id },
          data: { status: "failed", errorMessage: message },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: { walletCents: { increment: costCents } },
        }),
        prisma.walletTx.create({
          data: {
            userId: user.id,
            amountCents: costCents,
            kind: "refund",
            description: `Буцаалт: ${upload.filename}`,
          },
        }),
      ]);
      return { ok: false, error: `Telegram алдаа: ${message}` };
    }
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/jobs");
    return { ok: true, jobId: job.id };
  }

  // Dispatch to PrintNode (best-effort — if it fails we mark the job failed
  // and refund. If PrintNode isn't configured yet we still keep the job as
  // "queued" so shops can pick up manually.)
  try {
    if (!printer.printNodeId) throw new Error("Хэвлэгч PrintNode-д холбогдоогүй.");
    const payload = await contentForPrintNode(upload.storedPath, upload.mimeType);
    const printNodeJobId = await createPrintJob({
      printerId: printer.printNodeId,
      title: upload.filename,
      contentType: payload.contentType,
      content: payload.content,
      source: "khevlekh-uul",
      options: {
        copies: parsed.data.copies,
        color: parsed.data.color ? true : undefined,
        duplex: parsed.data.duplex ? "long-edge" : "one-sided",
      },
    });
    await prisma.printJob.update({
      where: { id: job.id },
      // printNodeJobId is a BigInt column; PrintNode returns a plain number.
      data: { status: "sent", printNodeJobId: BigInt(printNodeJobId) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Тодорхойгүй алдаа";
    // Refund on dispatch failure — job never reached the printer.
    await prisma.$transaction([
      prisma.printJob.update({
        where: { id: job.id },
        data: { status: "failed", errorMessage: message },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { walletCents: { increment: costCents } },
      }),
      prisma.walletTx.create({
        data: {
          userId: user.id,
          amountCents: costCents,
          kind: "refund",
          description: `Буцаалт: ${upload.filename}`,
        },
      }),
    ]);
    return { ok: false, error: `PrintNode алдаа: ${message}` };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/jobs");
  return { ok: true, jobId: job.id };
}

export async function getPriceQuoteAction(input: {
  pageCount: number;
  copies: number;
  color: boolean;
  printerId: string;
}): Promise<{ perPageCents: number; totalCents: number }> {
  const printer = await prisma.printer.findUnique({ where: { id: input.printerId } });
  return {
    perPageCents: perPageCents(input.color, printer),
    totalCents: estimateCostCents({
      pageCount: input.pageCount,
      copies: input.copies,
      color: input.color,
      printer,
    }),
  };
}
