import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { agentAuthorized, duplexMode } from "@/lib/agent";

// GET /api/agent/jobs?printerId=<id>[,<id2>...]
//
// The local agent (n8n) polls this endpoint. It returns queued jobs whose
// deliveryMethod is "agent" for the given printer(s) and atomically CLAIMS them
// (queued → sent) so a subsequent poll won't hand them out again. The agent
// then downloads each file, prints it, and POSTs the result back.
//
// Auth: Authorization: Bearer <PRINT_AGENT_TOKEN>
export async function GET(req: Request) {
  if (!agentAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const printerParam = url.searchParams.get("printerId") ?? "";
  const printerIds = printerParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (printerIds.length === 0) {
    return NextResponse.json({ error: "printerId required" }, { status: 400 });
  }

  const limit = Math.min(Number(url.searchParams.get("limit") ?? 10) || 10, 50);

  const candidates = await prisma.printJob.findMany({
    where: {
      printerId: { in: printerIds },
      deliveryMethod: "agent",
      status: "queued",
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: { upload: true },
  });

  if (candidates.length === 0) {
    return NextResponse.json({ jobs: [] });
  }

  // Claim them. The status:"queued" guard makes a concurrent poll's update a
  // no-op for already-claimed rows (single agent per printer is the norm).
  const ids = candidates.map((j) => j.id);
  await prisma.printJob.updateMany({
    where: { id: { in: ids }, status: "queued" },
    data: { status: "sent" },
  });

  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  const jobs = candidates.map((j) => ({
    id: j.id,
    filename: j.upload.filename,
    mimeType: j.upload.mimeType,
    fileUrl: `${base}/api/agent/jobs/${j.id}/file`,
    printerId: j.printerId,
    copies: j.copies,
    color: j.color,
    duplex: j.duplex,
    duplexMode: duplexMode(j.duplex),
    pageCount: j.pageCount,
  }));

  return NextResponse.json({ jobs });
}
