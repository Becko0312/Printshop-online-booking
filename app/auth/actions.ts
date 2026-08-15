"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, destroySession, homeForRole } from "@/lib/session";

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().max(120).optional(),
  // Self-service registration allows CUSTOMER or MERCHANT. ADMIN is never
  // grantable through signup.
  role: z.enum(["CUSTOMER", "MERCHANT"]).default("CUSTOMER"),
});

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type FormResult = { error?: string } | undefined;

export async function signUpAction(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const roleInput = String(formData.get("role") ?? "CUSTOMER").toUpperCase();
  const parsed = signUpSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
    name: String(formData.get("name") ?? "").trim() || undefined,
    role: roleInput === "MERCHANT" ? "MERCHANT" : "CUSTOMER",
  });
  if (!parsed.success) return { error: "И-мэйл эсвэл нууц үг буруу." };

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { error: "Энэ и-мэйл аль хэдийн бүртгэлтэй байна." };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      name: parsed.data.name,
      role: parsed.data.role,
    },
  });
  await createSession(user.id);
  // Merchants land on their own dashboard, customers on the print dashboard.
  redirect(homeForRole(user.role));
}

export async function signInAction(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const parsed = signInSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) return { error: "И-мэйл эсвэл нууц үг буруу." };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return { error: "И-мэйл эсвэл нууц үг буруу байна." };
  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) return { error: "И-мэйл эсвэл нууц үг буруу байна." };

  await createSession(user.id);
  // Merchants and admins land on their own dashboards.
  redirect(homeForRole(user.role));
}

export async function signOutAction() {
  await destroySession();
  redirect("/");
}
