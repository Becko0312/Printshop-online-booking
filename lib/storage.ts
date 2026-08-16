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
  // Three ways Vercel Blob can be authenticated:
  //   1. Explicit BLOB_READ_WRITE_TOKEN (works everywhere, incl. local dev)
  //   2. OIDC connection on Vercel — SDK reads BLOB_STORE_ID and uses the
  //      runtime OIDC token automatically (no explicit secret needed)
  //   3. Any Vercel runtime with a store connected — safe default
  return !!(
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.BLOB_STORE_ID ||
    process.env.VERCEL
  );
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
      "Vercel Blob is not configured. On Vercel: Storage → Blob → Create and " +
        "connect the store to this project (either OIDC or a static " +
        "BLOB_READ_WRITE_TOKEN works). Locally, add BLOB_READ_WRITE_TOKEN to " +
        ".env.",
    );
  }

  // Local dev fallback
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, safeName), buf);
  return { storedPath: safeName, isRemote: false };
}

/**
 * Read an upload's bytes regardless of where it lives (Blob URL or local disk).
 * Used by the standalone print-agent file proxy (/api/agent/jobs/[id]/file).
 */
export async function readUpload(storedPath: string): Promise<Buffer> {
  if (/^https?:\/\//.test(storedPath)) {
    const res = await fetch(storedPath, { cache: "no-store" });
    if (!res.ok) throw new Error(`fetch upload failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return fs.readFile(path.join(UPLOAD_DIR, storedPath));
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
