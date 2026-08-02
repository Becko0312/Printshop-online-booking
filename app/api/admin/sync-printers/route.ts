import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { listPrinters } from "@/lib/printnode";

// One-shot PrintNode sync. Call this after installing PrintNode Client on a
// new shop machine to attach the discovered printer to the Printer row you've
// pre-created (matched by exact name).
//
// Auth: send header `x-admin-token: $AUTH_SECRET` (deliberately reusing the
// session secret; swap for a dedicated admin token in prod).
export async function POST(req: Request) {
  const token = req.headers.get("x-admin-token");
  if (!token || token !== process.env.AUTH_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const remote = await listPrinters();
  let attached = 0;
  let updated = 0;

  for (const rp of remote) {
    // Match against Printer.name (create the DB row up-front with the exact
    // printer name reported by PrintNode).
    const db = await prisma.printer.findFirst({ where: { name: rp.name } });
    if (!db) continue;
    const patch: Record<string, unknown> = {
      printNodeId: rp.id,
      active: rp.state === "online",
    };
    if (rp.capabilities?.color !== undefined) {
      patch.colorSupported = !!rp.capabilities.color;
    }
    if (rp.capabilities?.duplex !== undefined) {
      patch.duplexSupported = !!rp.capabilities.duplex;
    }
    await prisma.printer.update({ where: { id: db.id }, data: patch });
    if (db.printNodeId == null) attached++;
    else updated++;
  }

  return NextResponse.json({ ok: true, remote: remote.length, attached, updated });
}
