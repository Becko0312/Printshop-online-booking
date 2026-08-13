import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./db";

const COOKIE = "khevlekh_session";
const ALG = "HS256";

function secret(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 16) {
    throw new Error("AUTH_SECRET is missing or too short (>=16 chars).");
  }
  return new TextEncoder().encode(raw);
}

export type SessionPayload = { uid: string };

export async function createSession(userId: string) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, secret());
    const uid = (payload as SessionPayload).uid;
    return typeof uid === "string" ? uid : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const uid = await getSessionUserId();
  if (!uid) return null;
  return prisma.user.findUnique({ where: { id: uid } });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");
  return user;
}

// The landing route for a given role — used to send users to the right
// dashboard after sign-in and to bounce them out of areas they don't own.
export function homeForRole(role: string): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "MERCHANT":
      return "/merchant";
    default:
      return "/dashboard";
  }
}

export async function requireMerchant() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");
  // Admins may also view merchant tooling; customers get sent home.
  if (user.role !== "MERCHANT" && user.role !== "ADMIN") {
    redirect(homeForRole(user.role));
  }
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");
  if (user.role !== "ADMIN") redirect(homeForRole(user.role));
  return user;
}
