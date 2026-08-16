// Auth + helpers for the standalone print-agent API (/api/agent/*).
//
// A merchant's local print agent(s) authenticate with the merchant's
// `agentToken` as an HTTP Bearer token. This resolves that token to the owning
// merchant, or null if the token is missing/unknown/not a merchant.

import { randomBytes } from "node:crypto";
import { prisma } from "./db";

export async function authMerchantByToken(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!m) return null;
  const token = m[1].trim();
  if (!token) return null;

  const user = await prisma.user.findUnique({ where: { agentToken: token } });
  if (!user) return null;
  if (user.role !== "MERCHANT" && user.role !== "ADMIN") return null;
  return user;
}

export function newAgentToken(): string {
  return "agt_" + randomBytes(24).toString("hex");
}

// Base URL for building agent-facing links (file download endpoint). Prefer the
// configured public URL; fall back to the request origin.
export function appBaseUrl(req: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (env) return env;
  return new URL(req.url).origin;
}
