// Upload normalization: turn whatever the customer uploads into a single,
// print-ready format — PDF — at the moment of upload.
//
// Why here (not at print time): PDF is the one format every OS + printer prints
// reliably (Linux/Mac via Ghostscript, Windows via SumatraPDF). Normalizing once
// at the source means the PrintNode path AND the local-agent path, on every
// merchant's machine, only ever handle PDF. The fragile "last mile" (drivers,
// image filters) never sees a raw image or a Word file. One conversion, no
// per-merchant surprises.
//
//   • JPEG / PNG → PDF   (pdf-lib, pure JS, embeds bytes losslessly)
//   • DOCX       → PDF   (LibreOffice via an optional Gotenberg service)
//   • PDF / other → passed through unchanged

import { isRasterImage, imageToPdf } from "./imaging";
import { countPdfPages } from "./pdf";

export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function isDocx(mime: string): boolean {
  return mime === DOCX_MIME;
}

// A self-hosted Gotenberg instance (LibreOffice + Chromium in a container) does
// faithful DOCX→PDF. Keeping it self-hosted means customer documents never
// leave your infrastructure. Unset → DOCX cannot be normalized (see below).
export function gotenbergUrl(): string | null {
  const u = process.env.GOTENBERG_URL?.replace(/\/$/, "");
  return u || null;
}

// Thrown when a DOCX is uploaded but no converter is configured. The caller
// turns this into a friendly "please upload a PDF" message rather than debiting
// the wallet and failing at the printer.
export class UnsupportedFormatError extends Error {}

export type Normalized = {
  buf: Buffer;
  filename: string;
  mimeType: string;
  // Known page count when we can determine it (1 for a single image, the real
  // count for a produced PDF), else null so the UI asks the user.
  pageCount: number | null;
  converted: boolean;
};

export async function normalizeUpload(
  buf: Buffer,
  filename: string,
  mime: string,
): Promise<Normalized> {
  const base = filename.replace(/\.[^.]+$/, "");

  if (isRasterImage(mime)) {
    const pdf = Buffer.from(await imageToPdf(new Uint8Array(buf), mime));
    return {
      buf: pdf,
      filename: `${base}.pdf`,
      mimeType: "application/pdf",
      pageCount: 1,
      converted: true,
    };
  }

  if (isDocx(mime)) {
    const g = gotenbergUrl();
    if (!g) throw new UnsupportedFormatError("DOCX_NO_CONVERTER");
    const pdf = await docxToPdf(buf, filename, g);
    return {
      buf: pdf,
      filename: `${base}.pdf`,
      mimeType: "application/pdf",
      pageCount: countPdfPages(pdf),
      converted: true,
    };
  }

  // PDF or anything else: pass through untouched.
  return {
    buf,
    filename,
    mimeType: mime,
    pageCount: mime === "application/pdf" ? countPdfPages(buf) : null,
    converted: false,
  };
}

// POST the DOCX to Gotenberg's LibreOffice route; get a PDF back.
async function docxToPdf(
  buf: Buffer,
  filename: string,
  gotenberg: string,
): Promise<Buffer> {
  const form = new FormData();
  form.append("files", new Blob([new Uint8Array(buf)]), filename || "document.docx");
  const res = await fetch(`${gotenberg}/forms/libreoffice/convert`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gotenberg ${res.status}: ${text.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
