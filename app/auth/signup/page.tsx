"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/ui";
import { signUpAction, type FormResult } from "@/app/auth/actions";

export default function SignUpPage() {
  const [state, formAction, pending] = useActionState<FormResult, FormData>(
    signUpAction,
    undefined,
  );
  const [role, setRole] = useState<"CUSTOMER" | "MERCHANT">("CUSTOMER");

  return (
    <main className="min-h-screen grid place-items-center px-4 bg-slate-50">
      <div className="card w-full max-w-md p-8">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
          ← {t.brand}
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">
          {t.auth.signUpTitle}
        </h1>

        <form action={formAction} className="mt-6 space-y-4">
          <input type="hidden" name="role" value={role} />
          <div>
            <div className="label">{t.auth.chooseRole}</div>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["CUSTOMER", t.auth.roleCustomer, t.auth.roleCustomerHint],
                  ["MERCHANT", t.auth.roleMerchant, t.auth.roleMerchantHint],
                ] as const
              ).map(([value, title, hint]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  aria-pressed={role === value}
                  className={cn(
                    "rounded-lg border p-3 text-left transition",
                    role === value
                      ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-500"
                      : "border-slate-200 hover:border-slate-300",
                  )}
                >
                  <div className="font-medium text-slate-800">{title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{hint}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="name">
              {t.common.name}
            </label>
            <input id="name" name="name" type="text" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="email">
              {t.common.email}
            </label>
            <input id="email" name="email" type="email" className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="password">
              {t.common.password}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              required
              minLength={6}
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? t.common.loading : t.common.signUp}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-500">
          {t.auth.haveAccount}{" "}
          <Link href="/auth/signin" className="text-brand-600 font-medium">
            {t.common.signIn}
          </Link>
        </p>
      </div>
    </main>
  );
}
