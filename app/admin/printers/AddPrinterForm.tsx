"use client";

import { useActionState, useEffect, useRef } from "react";
import { t } from "@/lib/i18n";
import { addPrinterAction, type AdminResult } from "../actions";

type MerchantOption = { id: string; label: string };

export default function AddPrinterForm({
  merchants,
}: {
  merchants: MerchantOption[];
}) {
  const [state, formAction, pending] = useActionState<AdminResult, FormData>(
    addPrinterAction,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state?.ok]);

  return (
    <form ref={formRef} action={formAction} className="card p-5 space-y-4">
      <h2 className="font-semibold">{t.admin.addPrinter}</h2>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="p-name">
            {t.common.printer}
          </label>
          <input id="p-name" name="name" className="input" required maxLength={120} />
        </div>
        <div>
          <label className="label" htmlFor="p-district">
            Дүүрэг
          </label>
          <input id="p-district" name="district" className="input" required maxLength={120} />
        </div>
        <div>
          <label className="label" htmlFor="p-location">
            Байршил
          </label>
          <input id="p-location" name="location" className="input" required maxLength={200} />
        </div>
        <div>
          <label className="label" htmlFor="p-address">
            Хаяг (сонголт)
          </label>
          <input id="p-address" name="address" className="input" maxLength={200} />
        </div>
        <div>
          <label className="label" htmlFor="p-merchant">
            {t.admin.assignMerchant}
          </label>
          <select id="p-merchant" name="merchantId" className="input" defaultValue="">
            <option value="">{t.admin.unassigned}</option>
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="p-bw">
              Хар/цагаан (¢/хуудас)
            </label>
            <input
              id="p-bw"
              name="bwCentsPerPage"
              type="number"
              min={0}
              className="input"
              placeholder="default"
            />
          </div>
          <div>
            <label className="label" htmlFor="p-color">
              Өнгөт (¢/хуудас)
            </label>
            <input
              id="p-color"
              name="colorCentsPerPage"
              type="number"
              min={0}
              className="input"
              placeholder="default"
            />
          </div>
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
      {state?.ok && <p className="text-sm text-emerald-600">{state.message}</p>}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? t.common.loading : t.admin.addPrinter}
      </button>
    </form>
  );
}
