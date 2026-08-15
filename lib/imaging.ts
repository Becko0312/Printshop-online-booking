// Wrap a raster image (JPEG/PNG) into a print-ready PDF.
//
// Why: some local CUPS image filters (cfFilterImageToPDF) fail to decode
// perfectly valid JPEGs — especially "bare" JPEGs without a JFIF/EXIF header —
// and emit an empty job. Routing images through a PDF instead means the print
// pipeline uses Ghostscript, whose JPEG decoder is far more robust. pdf-lib
// embeds the original image bytes as-is (no re-encode, no quality loss); the
// decode happens at print time in gs.
//
// pdf-lib is pure JS, so this runs on Vercel with no native dependencies.

import { PDFDocument } from "pdf-lib";

const A4 = { w: 595.28, h: 841.89 }; // points (72 dpi)
const MARGIN = 18; // ~0.25"

export function isRasterImage(mime: string): boolean {
  return mime === "image/png" || mime === "image/jpeg" || mime === "image/jpg";
}

// Returns a single-page PDF sized to A4 (portrait or landscape to match the
// image), with the image scaled to fit within the margins and centered.
export async function imageToPdf(bytes: Uint8Array, mime: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const img =
    mime === "image/png"
      ? await pdf.embedPng(bytes)
      : await pdf.embedJpg(bytes);

  const landscape = img.width > img.height;
  const pageW = landscape ? A4.h : A4.w;
  const pageH = landscape ? A4.w : A4.h;
  const page = pdf.addPage([pageW, pageH]);

  const maxW = pageW - MARGIN * 2;
  const maxH = pageH - MARGIN * 2;
  const scale = Math.min(maxW / img.width, maxH / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  page.drawImage(img, {
    x: (pageW - w) / 2,
    y: (pageH - h) / 2,
    width: w,
    height: h,
  });

  return pdf.save();
}
