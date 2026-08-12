// Storage abstraction. In production (Vercel), files go to Vercel Blob and we
// hand PrintNode a public URL so the print client streams it directly. In
// local dev without a BLOB_READ_WRITE_TOKEN, we fall back to /uploads on disk
// so `npm run dev` "just works".
//
// The Upload.storedPath column holds either:
//   - a full https:// URL (Blob), or
//   - a bare filename under /uploads (local disk fallback)
// Callers use `readFile` / `contentForPrintNode` to abstract over both.

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export function isBlobEnabled(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

function sanitize(s: string): string {
  return s.replace(/[^\w.\-]+/g, "_").slice(0, 120);
}

/**
 * Persist an uploaded buffer. Returns the value to store in
 * `Upload.storedPath` — either a Blob URL or a local filename.
 */
export async function saveUpload(
  buf: Buffer,
  filename: string,
  mimeType: string,
): Promise<{ storedPath: string; isRemote: boolean }> {
  const safeName = `${randomUUID()}-${sanitize(filename)}`;

  if (isBlobEnabled()) {
    // Lazy import so `next dev` doesn't crash if the package isn't installed
    // yet (e.g. someone cloned before running `npm install`).
    const { put } = await import("@vercel/blob");
    const blob = await put(safeName, buf, {
      access: "public",
      contentType: mimeType,
      // Blob adds a random suffix by default; we already prefix with a UUID.
      addRandomSuffix: false,
    });
    return { storedPath: blob.url, isRemote: true };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not set. Enable Vercel Blob on this project " +
        "(Storage → Blob → Create) and add the auto-generated token to your " +
        "environment variables. On Vercel this happens with one click.",
    );
  }

  // Local dev fallback
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, safeName), buf);
  return { storedPath: safeName, isRemote: false };
}

/**
 * Return the content PrintNode should ingest. If we have a URL we pass it
 * through as `*_uri` (PrintNode fetches it directly, much faster than
 * base64). Otherwise we base64-encode the local file.
 */
export async function contentForPrintNode(
  storedPath: string,
  mimeType: string,
): Promise<
  | { contentType: "pdf_uri" | "raw_uri"; content: string }
  | { contentType: "pdf_base64" | "raw_base64"; content: string }
> {
  const isPdf = mimeType === "application/pdf";

  if (/^https?:\/\//.test(storedPath)) {
    return {
      contentType: isPdf ? "pdf_uri" : "raw_uri",
      content: storedPath,
    };
  }

  const buf = await fs.readFile(path.join(UPLOAD_DIR, storedPath));
  return {
    contentType: isPdf ? "pdf_base64" : "raw_base64",
    content: buf.toString("base64"),
  };
}
