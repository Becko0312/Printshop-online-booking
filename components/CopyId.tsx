"use client";

import { useState } from "react";

// Shows a printer's PRINTER_ID with a one-click copy button, so an admin can
// grab the exact id to configure a shop-PC print agent (agent/print-agent.mjs).
export default function CopyId({ id, copy, copied }: {
  id: string;
  copy: string;
  copied: string;
}) {
  const [done, setDone] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      // Fallback for non-secure contexts / older browsers.
      const ta = document.createElement("textarea");
      ta.value = id;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta);
    }
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  }

  return (
    <div className="mt-1 flex items-center gap-2">
      <span className="text-[11px] text-slate-400 shrink-0">PRINTER_ID</span>
      <code className="text-[11px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 font-mono truncate max-w-[180px] sm:max-w-none">
        {id}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        className="text-[11px] text-brand-600 hover:text-brand-700 underline shrink-0"
      >
        {done ? copied : copy}
      </button>
    </div>
  );
}
