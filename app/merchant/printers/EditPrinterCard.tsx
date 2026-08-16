"use client";

import { useActionState, useState } from "react";
import { t } from "@/lib/i18n";
import { editMyPrinterAction, type PrinterFormResult } from "./actions";

export type EditablePrinter = {
  id: string;
  name: string;
  district: string;
  location: string;
  address: string | null;
  colorSupported: boolean;
  duplexSupported: boolean;
  active: boolean;
  printNodeId: number | null;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  n8nWebhookUrl: string | null;
};

export default function EditPrinterCard({ printer }: { printer: EditablePrinter }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<
    PrinterFormResult,
    FormData
  >(editMyPrinterAction, undefined);

  const printNodeOnline = printer.active && printer.printNodeId != null;
  const telegramReady = !!(printer.telegramBotToken && printer.telegramChatId);

  return (
    <li className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-slate-800">{printer.name}</div>
          <div className="text-xs text-slate-500">
            {printer.district} · {printer.location}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={
              "chip " +
              (printNodeOnline
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500")
            }
          >
            {printNodeOnline ? t.printers.online : t.merchant.pendingConnect}
          </span>
          <span
            className={
              "chip " +
              (telegramReady
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500")
            }
          >
            {telegramReady ? t.merchant.telegramReady : t.merchant.telegramNotReady}
          </span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <span className="chip bg-slate-100 text-slate-600">
          {printer.colorSupported ? t.printers.supportsColor : t.printers.supportsBw}
        </span>
        {printer.duplexSupported && (
          <span className="chip bg-slate-100 text-slate-600">{t.common.duplex}</span>
        )}
      </div>

      <div className="mt-3">
        <button
          type="button"
          className="btn-ghost text-sm"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? t.merchant.cancel : t.merchant.edit}
        </button>
      </div>

      {open && (
        <form action={formAction} className="mt-4 space-y-4 border-t pt-4">
          <input type="hidden" name="id" value={printer.id} />

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor={`name-${printer.id}`}>
                {t.common.printer}
              </label>
              <input
                id={`name-${printer.id}`}
                name="name"
                className="input"
                required
                maxLength={120}
                defaultValue={printer.name}
              />
            </div>
            <div>
              <label className="label" htmlFor={`district-${printer.id}`}>
                Дүүрэг
              </label>
              <input
                id={`district-${printer.id}`}
                name="district"
                className="input"
                required
                maxLength={120}
                defaultValue={printer.district}
              />
            </div>
            <div>
              <label className="label" htmlFor={`location-${printer.id}`}>
                Байршил
              </label>
              <input
                id={`location-${printer.id}`}
                name="location"
                className="input"
                required
                maxLength={200}
                defaultValue={printer.location}
              />
            </div>
            <div>
              <label className="label" htmlFor={`address-${printer.id}`}>
                Хаяг (сонголт)
              </label>
              <input
                id={`address-${printer.id}`}
                name="address"
                className="input"
                maxLength={200}
                defaultValue={printer.address ?? ""}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="colorSupported"
                defaultChecked={printer.colorSupported}
              />
              {t.common.color}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="duplexSupported"
                defaultChecked={printer.duplexSupported}
              />
              {t.common.duplex}
            </label>
          </div>

          <div className="rounded-lg border border-slate-200 p-4 space-y-3 bg-slate-50/40">
            <div>
              <div className="font-medium text-slate-800">
                {t.merchant.telegramSection}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {t.merchant.telegramSectionHint}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label
                  className="label"
                  htmlFor={`telegramBotToken-${printer.id}`}
                >
                  {t.merchant.telegramBotToken}
                </label>
                <input
                  id={`telegramBotToken-${printer.id}`}
                  name="telegramBotToken"
                  className="input"
                  maxLength={120}
                  placeholder="123456789:AAE…"
                  defaultValue={printer.telegramBotToken ?? ""}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div>
                <label
                  className="label"
                  htmlFor={`telegramChatId-${printer.id}`}
                >
                  {t.merchant.telegramChatId}
                </label>
                <input
                  id={`telegramChatId-${printer.id}`}
                  name="telegramChatId"
                  className="input"
                  maxLength={64}
                  placeholder="123456789 эсвэл -1001234567890"
                  defaultValue={printer.telegramChatId ?? ""}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div className="sm:col-span-2">
                <label
                  className="label"
                  htmlFor={`n8nWebhookUrl-${printer.id}`}
                >
                  {t.merchant.n8nWebhookUrl}
                </label>
                <input
                  id={`n8nWebhookUrl-${printer.id}`}
                  name="n8nWebhookUrl"
                  className="input"
                  maxLength={300}
                  placeholder="https://xxxx.ngrok-free.dev/webhook/uulen-print"
                  defaultValue={printer.n8nWebhookUrl ?? ""}
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="text-xs text-slate-500 mt-1">
                  {t.merchant.n8nWebhookUrlHint}
                </p>
              </div>
            </div>
          </div>

          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}
          {state?.ok && (
            <p className="text-sm text-emerald-600">{t.merchant.saved}</p>
          )}

          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? t.common.loading : t.merchant.save}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setOpen(false)}
            >
              {t.merchant.cancel}
            </button>
          </div>
        </form>
      )}
    </li>
  );
}
