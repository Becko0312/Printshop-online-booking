import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { agentAuthorized } from "@/lib/agent";
import { isRasterImage, imageToPdf } from "@/lib/imaging";

// GET /api/agent/jobs/:id/file — stream the job's file to the local agent.
//
// Images (JPEG/PNG) are wrapped into a PDF here so the shop's CUPS prints them
// via the reliable Ghostscript/PDF pipeline instead of the flaky image filter.
// CUPS detects type by content, so the agent can still save it under any name.
// PDFs (and anything else) are passed through: a Blob URL is redirected, a
// local-dev file is streamed from disk.
//
// Auth: Authorization: Bearer <PRINT_AGENT_TOKEN>
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!agentAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const job = await prisma.printJob.findUnique({
    where: { id },
    include: { upload: true },
  });
  if (!job) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const stored = job.upload.storedPath;
  const mime = job.upload.mimeType;
  const image = isRasterImage(mime);

  // Load the raw bytes (from Blob over https, or local disk in dev).
  let bytes: Uint8Array;
  if (/^https?:\/\//.test(stored)) {
    // Non-image: redirect the agent straight to Blob (fast, no proxying).
    if (!image) return NextResponse.redirect(stored, 302);
    const res = await fetch(stored, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: "blob fetch failed" }, { status: 502 });
    }
    bytes = new Uint8Array(await res.arrayBuffer());
  } else {
    const UPLOAD_DIR = path.join(process.cwd(), "uploads");
    const filePath = path.join(UPLOAD_DIR, stored);
    // Guard against path traversal via a tampered storedPath.
    if (!filePath.startsWith(UPLOAD_DIR + path.sep)) {
      return NextResponse.json({ error: "invalid path" }, { status: 400 });
    }
    try {
      bytes = new Uint8Array(await fs.readFile(filePath));
    } catch {
      return NextResponse.json({ error: "file missing" }, { status: 404 });
    }
  }

  // Images → wrap into a PDF so CUPS prints via the robust Ghostscript path.
  // If conversion somehow fails, fall back to the original bytes.
  if (image) {
    try {
      const pdf = await imageToPdf(bytes, mime);
      return new NextResponse(new Uint8Array(pdf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(
            job.upload.filename.replace(/\.[^.]+$/, "") + ".pdf",
          )}"`,
        },
      });
    } catch {
      // fall through to raw bytes below
    }
  }

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": mime || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(
        job.upload.filename,
      )}"`,
    },
  });
}
