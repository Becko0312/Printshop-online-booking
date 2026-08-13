"use client";

import { useActionState, useEffect, useRef } from "react";
import { t } from "@/lib/i18n";
import { addMyPrinterAction, type PrinterFormResult } from "./actions";

export default function AddPrinterForm() {
  const [state, formAction, pending] = useActionState<PrinterFormResult, FormData>(
    addMyPrinterAction,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Reset the fields after a successful submit so the merchant can add another.
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state?.ok]);

  return (
    <form ref={formRef} action={formAction} className="card p-5 space-y-4">
      <div>
        <h2 className="font-semibold">{t.merchant.addPrinter}</h2>
        <p className="text-slate-500 text-sm mt-1">{t.merchant.addPrinterHint}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="name">
            {t.common.printer}
          </label>
          <input id="name" name="name" className="input" required maxLength={120} />
        </div>
        <div>
          <label className="label" htmlFor="district">
            Дүүрэг
          </label>
          <input id="district" name="district" className="input" required maxLength={120} />
        </div>
        <div>
          <label className="label" htmlFor="location">
            Байршил
          </label>
          <input id="location" name="location" className="input" required maxLength={200} />
        </div>
        <div>
          <label className="label" htmlFor="address">
            Хаяг (сонголт)
          </label>
          <input id="address" name="address" className="input" maxLength={200} />
        </div>
      </div>

      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="colorSupported" />
          {t.common.color}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="duplexSupported" />
          {t.common.duplex}
        </label>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-600">{t.merchant.created}</p>}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? t.common.loading : t.merchant.addPrinter}
      </button>
    </form>
  );
}
