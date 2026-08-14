import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { agentAuthorized } from "@/lib/agent";

// GET /api/agent/jobs/:id/file — stream the job's file to the local agent.
//
// In production the upload lives in Vercel Blob (a public https URL) so we just
// redirect the agent there. In local dev the file is on disk under /uploads.
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

  // Blob / remote URL → redirect the agent straight to it.
  if (/^https?:\/\//.test(stored)) {
    return NextResponse.redirect(stored, 302);
  }

  // Local disk fallback.
  const UPLOAD_DIR = path.join(process.cwd(), "uploads");
  const filePath = path.join(UPLOAD_DIR, stored);
  // Guard against path traversal via a tampered storedPath.
  if (!filePath.startsWith(UPLOAD_DIR + path.sep)) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }
  try {
    const buf = await fs.readFile(filePath);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": job.upload.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          job.upload.filename,
        )}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "file missing" }, { status: 404 });
  }
}
