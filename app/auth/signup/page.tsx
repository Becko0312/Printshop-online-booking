"use client";

import Link from "next/link";
import { useActionState } from "react";
import { t } from "@/lib/i18n";
import { signUpAction, type FormResult } from "@/app/auth/actions";

export default function SignUpPage() {
  const [state, formAction, pending] = useActionState<FormResult, FormData>(
    signUpAction,
    undefined,
  );

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
