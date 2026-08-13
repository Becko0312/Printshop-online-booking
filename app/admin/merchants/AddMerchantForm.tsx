"use client";

import { useActionState, useEffect, useRef } from "react";
import { t } from "@/lib/i18n";
import { addMerchantAction, type AdminResult } from "../actions";

export default function AddMerchantForm() {
  const [state, formAction, pending] = useActionState<AdminResult, FormData>(
    addMerchantAction,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state?.ok]);

  return (
    <form ref={formRef} action={formAction} className="card p-5 space-y-4">
      <h2 className="font-semibold">{t.admin.addMerchant}</h2>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="name">
            {t.common.name}
          </label>
          <input id="name" name="name" className="input" maxLength={120} />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            {t.common.phone}
          </label>
          <input id="phone" name="phone" className="input" maxLength={40} />
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
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-600">{state.message}</p>}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? t.common.loading : t.admin.addMerchant}
      </button>
    </form>
  );
}
