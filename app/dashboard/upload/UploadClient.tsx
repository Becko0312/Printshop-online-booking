"use client";

import { useMemo, useState, useTransition } from "react";
import { t } from "@/lib/i18n";
import { formatMnt } from "@/lib/pricing";
import { cn } from "@/lib/ui";
import {
  uploadFileAction,
  submitPrintJobAction,
  type UploadResult,
  type SubmitResult,
} from "./actions";

type Printer = {
  id: string;
  name: string;
  district: string;
  location: string;
  colorSupported: boolean;
  duplexSupported: boolean;
  bwCentsPerPage: number | null;
  colorCentsPerPage: number | null;
  connected: boolean;
  telegramReady: boolean;
};

type Method = "printnode" | "agent" | "telegram";

const DEFAULT_BW = 400;
const DEFAULT_COLOR = 800;

export default function UploadClient({
  walletCents,
  printers,
}: {
  walletCents: number;
  printers: Printer[];
}) {
  const [uploaded, setUploaded] = useState<
    Extract<UploadResult, { ok: true }> | null
  >(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();

  const [pageCount, setPageCount] = useState<number>(1);
  const [copies, setCopies] = useState<number>(1);
  const [color, setColor] = useState<boolean>(false);
  const [duplex, setDuplex] = useState<boolean>(false);
  const [printerId, setPrinterId] = useState<string>("");

  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [submitting, startSubmit] = useTransition();
  // After "Хэвлэлт илгээх" we reveal the delivery choice (PrintNode / agent)
  // instead of dispatching immediately.
  const [showMethods, setShowMethods] = useState(false);
  const [lastMethod, setLastMethod] = useState<Method | null>(null);

  const selectedPrinter = useMemo(
    () => printers.find((p) => p.id === printerId) ?? null,
    [printerId, printers],
  );

  const perPage =
    color
      ? selectedPrinter?.colorCentsPerPage ?? DEFAULT_COLOR
      : selectedPrinter?.bwCentsPerPage ?? DEFAULT_BW;
  const totalCents = perPage * Math.max(1, pageCount) * Math.max(1, copies);
  const canAfford = totalCents <= walletCents;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setSubmitResult(null);

    const fd = new FormData();
    fd.append("file", file);
    startUpload(async () => {
      const res = await uploadFileAction(fd);
      if (!res.ok) {
        setUploadError(res.error);
        return;
      }
      setUploaded(res);
      if (res.pageCount) setPageCount(res.pageCount);
    });
  }

  function submit(method: Method) {
    if (!uploaded) return;
    const fd = new FormData();
    fd.append("uploadId", uploaded.uploadId);
    fd.append("printerId", printerId);
    fd.append("copies", String(copies));
    fd.append("color", color ? "true" : "false");
    fd.append("duplex", duplex ? "true" : "false");
    fd.append("pageCount", String(pageCount));
    fd.append("method", method);
    setLastMethod(method);
    startSubmit(async () => {
      const res = await submitPrintJobAction(undefined, fd);
      setSubmitResult(res);
      if (res.ok) setShowMethods(false);
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t.upload.title}</h1>

      {/* Step 1: file */}
      <section className="card p-6">
        <h2 className="font-semibold mb-3">{t.upload.step1}</h2>
        <label
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer block",
            uploading ? "opacity-60" : "hover:border-brand-500 hover:bg-brand-50/40",
            uploaded ? "border-brand-500 bg-brand-50/40" : "border-slate-300",
          )}
        >
          <input
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.docx"
            onChange={handleFileChange}
            disabled={uploading}
          />
          {uploaded ? (
            <div>
              <div className="font-medium text-slate-800">{uploaded.filename}</div>
              <div className="text-sm text-slate-500 mt-1">
                {uploaded.pageCount
                  ? `${uploaded.pageCount} ${t.common.pages}`
                  : "Хуудасны тоог гараар оруулна уу"}
                {" · "}
                {uploaded.mimeType}
              </div>
            </div>
          ) : (
            <div>
              <div className="font-medium">{t.upload.dropHint}</div>
              <div className="text-sm text-slate-500 mt-1">{t.upload.supported}</div>
            </div>
          )}
        </label>
        {uploadError && <p className="mt-3 text-sm text-red-600">{uploadError}</p>}
      </section>

      {/* Step 2 + 3: printer + options */}
      {uploaded && (
        <form
          onSubmit={(e) => e.preventDefault()}
          className="grid md:grid-cols-2 gap-6"
        >
          <section className="card p-6">
            <h2 className="font-semibold mb-3">{t.upload.step2}</h2>
            {printers.length === 0 ? (
              <p className="text-sm text-slate-500">{t.printers.empty}</p>
            ) : (
              <ul className="space-y-2 max-h-96 overflow-y-auto">
                {printers.map((p) => (
                  <li key={p.id}>
                    <label
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer",
                        printerId === p.id
                          ? "border-brand-500 bg-brand-50/60"
                          : "border-slate-200 hover:bg-slate-50",
                      )}
                    >
                      <input
                        type="radio"
                        name="printerId"
                        value={p.id}
                        className="mt-1"
                        checked={printerId === p.id}
                        onChange={() => setPrinterId(p.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-slate-800">{p.name}</div>
                        <div className="text-xs text-slate-500">
                          {p.district} · {p.location}
                        </div>
                        <div className="mt-1 flex gap-1 flex-wrap">
                          {p.colorSupported ? (
                            <span className="chip bg-emerald-50 text-emerald-700">
                              {t.printers.supportsColor}
                            </span>
                          ) : (
                            <span className="chip bg-slate-100 text-slate-600">
                              {t.printers.supportsBw}
                            </span>
                          )}
                          {p.duplexSupported && (
                            <span className="chip bg-slate-100 text-slate-600">
                              {t.common.duplex}
                            </span>
                          )}
                          {!p.connected && (
                            <span className="chip bg-amber-50 text-amber-700">
                              PrintNode холбоогүй
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-6 space-y-4">
            <h2 className="font-semibold">{t.upload.step3}</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t.common.pages}</label>
                <input
                  type="number"
                  min={1}
                  max={5000}
                  className="input"
                  value={pageCount}
                  onChange={(e) => setPageCount(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label">{t.upload.copies}</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  className="input"
                  value={copies}
                  onChange={(e) => setCopies(Number(e.target.value))}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={color}
                onChange={(e) => setColor(e.target.checked)}
                disabled={!selectedPrinter?.colorSupported}
              />
              {t.upload.color}
              {selectedPrinter && !selectedPrinter.colorSupported && (
                <span className="text-xs text-slate-500">
                  (энэ хэвлэгч дэмждэггүй)
                </span>
              )}
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={duplex}
                onChange={(e) => setDuplex(e.target.checked)}
                disabled={!selectedPrinter?.duplexSupported}
              />
              {t.upload.duplex}
            </label>

            <div className="rounded-lg bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{t.upload.estCost}</span>
                <span className="font-semibold text-lg">
                  {formatMnt(totalCents)}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {perPage}¢ × {pageCount} {t.common.pages} × {copies}{" "}
                {t.common.copies}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                {t.dashboard.walletBalance}: {formatMnt(walletCents)}
              </div>
            </div>

            {!canAfford && (
              <p className="text-sm text-red-600">{t.upload.needTopUp}</p>
            )}

            {submitResult && submitResult.ok && (
              <p className="text-sm text-emerald-700">
                {lastMethod === "agent"
                  ? t.upload.jobQueuedAgent
                  : lastMethod === "telegram"
                  ? t.upload.jobSentTelegram
                  : t.upload.jobSent}
              </p>
            )}
            {submitResult && !submitResult.ok && (
              <p className="text-sm text-red-600">{submitResult.error}</p>
            )}

            {!showMethods ? (
              <button
                type="button"
                className="btn-primary w-full"
                disabled={
                  submitting ||
                  !printerId ||
                  !canAfford ||
                  pageCount < 1 ||
                  copies < 1
                }
                onClick={() => {
                  setSubmitResult(null);
                  setShowMethods(true);
                }}
              >
                {t.upload.sendPrint}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="text-sm font-medium text-slate-700">
                  {t.upload.chooseMethod}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => submit("printnode")}
                    disabled={submitting || !selectedPrinter?.connected}
                    className="rounded-lg border border-slate-200 p-4 text-center hover:border-brand-500 hover:bg-brand-50/40 disabled:opacity-50"
                  >
                    <div className="font-semibold">{t.upload.methodPrintNode}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {selectedPrinter && !selectedPrinter.connected
                        ? t.upload.printNodeNotConnected
                        : t.upload.methodPrintNodeHint}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => submit("agent")}
                    disabled={submitting}
                    className="rounded-lg border border-slate-200 p-4 text-center hover:border-brand-500 hover:bg-brand-50/40 disabled:opacity-50"
                  >
                    <div className="font-semibold">{t.upload.methodAgent}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {t.upload.methodAgentHint}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => submit("telegram")}
                    disabled={submitting || !selectedPrinter?.telegramReady}
                    className="rounded-lg border border-slate-200 p-4 text-center hover:border-brand-500 hover:bg-brand-50/40 disabled:opacity-50"
                  >
                    <div className="font-semibold">{t.upload.methodTelegram}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {selectedPrinter && !selectedPrinter.telegramReady
                        ? t.upload.telegramNotConfigured
                        : t.upload.methodTelegramHint}
                    </div>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMethods(false)}
                  disabled={submitting}
                  className="text-xs text-slate-500 underline"
                >
                  {t.upload.methodBack}
                </button>
              </div>
            )}
          </section>
        </form>
      )}
    </div>
  );
}
