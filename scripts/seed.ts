import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

// Minimal .env loader so `tsx scripts/seed.ts` works without extra deps.
try {
  const raw = readFileSync(".env", "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  // ignore
}

const prisma = new PrismaClient();

// Seed a plausible fleet of 12 partner shops across all 6 core districts of
// Улаанбаатар. In production replace with your real partner roster and let
// /api/admin/sync-printers wire them up to PrintNode.
const partners: Array<{
  name: string;
  district: string;
  location: string;
  colorSupported: boolean;
  duplexSupported: boolean;
}> = [
  { name: "Central Tower - 1F", district: "Сүхбаатарын дүүрэг", location: "Их сургуулийн гудамж", colorSupported: true, duplexSupported: true },
  { name: "Shangri-La Mall Print", district: "Сүхбаатарын дүүрэг", location: "Оlympiin гудамж", colorSupported: true, duplexSupported: true },
  { name: "State Dept Store Copy", district: "Сүхбаатарын дүүрэг", location: "Пис Авеню", colorSupported: false, duplexSupported: true },
  { name: "13-р хороолол - Copy", district: "Баянгол дүүрэг", location: "13-р хороолол, төв гудамж", colorSupported: true, duplexSupported: false },
  { name: "Ard Kino Copy", district: "Баянгол дүүрэг", location: "Ard Kino орчим", colorSupported: false, duplexSupported: false },
  { name: "Bayanzurkh IT Zone", district: "Баянзүрх дүүрэг", location: "Их Тойруу, IT Park", colorSupported: true, duplexSupported: true },
  { name: "Nairamdal Park Print", district: "Баянзүрх дүүрэг", location: "Нарийны замын уулзвар", colorSupported: false, duplexSupported: true },
  { name: "Chingeltei Books & Copy", district: "Чингэлтэй дүүрэг", location: "Ерөнхий сайд Амарын гудамж", colorSupported: true, duplexSupported: true },
  { name: "Khan-Uul MonPolyMet Copy", district: "Хан-Уул дүүрэг", location: "Zaisan road, MonPolyMet", colorSupported: true, duplexSupported: true },
  { name: "Zaisan Hill Print", district: "Хан-Уул дүүрэг", location: "Zaisan Hill Complex", colorSupported: false, duplexSupported: true },
  { name: "Songino Khairkhan West", district: "Сонгинохайрхан дүүрэг", location: "22-р хороолол, авто зогсоол", colorSupported: false, duplexSupported: false },
  { name: "Tolgoit Copy Center", district: "Сонгинохайрхан дүүрэг", location: "Толгойт, зам дагуу", colorSupported: true, duplexSupported: false },
];

// Bootstrap an admin account from env so there's a way to log in and manage
// merchants/printers. Set ADMIN_EMAIL + ADMIN_PASSWORD in .env before seeding.
// Re-running promotes an existing user to ADMIN and (optionally) resets the
// password — it never creates a duplicate.
async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("Skipping admin seed (set ADMIN_EMAIL + ADMIN_PASSWORD to enable).");
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", passwordHash },
    create: { email, passwordHash, role: "ADMIN", name: "Admin" },
  });
  console.log(`Admin ready: ${email}`);
}

async function main() {
  for (const p of partners) {
    const existing = await prisma.printer.findFirst({ where: { name: p.name } });
    if (existing) continue;
    await prisma.printer.create({ data: p });
  }
  const total = await prisma.printer.count();
  console.log(`Seeded. Printers now: ${total}`);

  await seedAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
