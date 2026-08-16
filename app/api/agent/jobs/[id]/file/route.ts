import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authMerchantByToken } from "@/lib/agent";
import { readUpload } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/agent/jobs/[id]/file
//
// Streams the job's upload bytes to the authenticated merchant's agent. Works
// whether the file lives in Vercel Blob or on local disk, and never exposes the
// underlying storage URL.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const merchant = await authMerchantByToken(req);
  if (!merchant) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const job = await prisma.printJob.findUnique({
    where: { id },
    include: {
      upload: { select: { storedPath: true, mimeType: true, filename: true } },
      printer: { select: { merchantId: true } },
    },
  });
  if (!job || job.printer?.merchantId !== merchant.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await readUpload(job.upload.storedPath);
  } catch {
    return NextResponse.json({ error: "file unavailable" }, { status: 502 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": job.upload.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(job.upload.filename)}"`,
      "Cache-Control": "no-store",
    },
  });
}
