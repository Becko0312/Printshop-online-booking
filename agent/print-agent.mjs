#!/usr/bin/env node
// Khevlekh-Uul local print agent.
//
// Runs on a merchant's shop PC. Polls the cloud for queued "agent" print jobs
// assigned to this shop's printer(s), downloads each file, prints it on the
// local OS, and reports the result back. This is the self-hosted alternative to
// PrintNode — no PrintNode subscription, no n8n, just Node.js.
//
// Requires Node 18+ (uses global fetch).
//
// Configure via environment variables (see agent/README.md):
//   APP_URL       Base URL of the app       (default https://cloud-printing-saas.vercel.app)
//   AGENT_TOKEN   Bearer token              (must match PRINT_AGENT_TOKEN on the server)  [required]
//   PRINTER_ID    Our DB printer id(s)      comma-separated, from the printers page       [required]
//   OS_PRINTER    Local/CUPS printer name   e.g. "HP_LaserJet_1020"                        [required]
//   POLL_MS       Poll interval in ms       (default 5000)
//   SUMATRA_PATH  Windows only: path to SumatraPDF.exe (default "SumatraPDF.exe")
//   PRINT_CMD     Optional command template override. Placeholders: {printer} {file} {copies}
//
// Start:  AGENT_TOKEN=... PRINTER_ID=... OS_PRINTER=... node agent/print-agent.mjs

import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

const APP_URL = (process.env.APP_URL || "https://cloud-printing-saas.vercel.app").replace(/\/$/, "");
const AGENT_TOKEN = process.env.AGENT_TOKEN || "";
const PRINTER_ID = process.env.PRINTER_ID || "";
const OS_PRINTER = process.env.OS_PRINTER || "";
const POLL_MS = Number(process.env.POLL_MS || 5000);
const SUMATRA_PATH = process.env.SUMATRA_PATH || "SumatraPDF.exe";
const PRINT_CMD = process.env.PRINT_CMD || "";

if (!AGENT_TOKEN || !PRINTER_ID || !OS_PRINTER) {
  console.error(
    "Missing config. Required: AGENT_TOKEN, PRINTER_ID, OS_PRINTER.\n" +
      "See agent/README.md.",
  );
  process.exit(1);
}

const authHeaders = { Authorization: `Bearer ${AGENT_TOKEN}` };

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

function extFor(filename, mimeType) {
  const fromName = path.extname(filename || "");
  if (fromName) return fromName;
  if (mimeType === "application/pdf") return ".pdf";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") return ".jpg";
  return ".bin";
}

// Build the OS print command as [cmd, args[]].
function buildPrintCommand(file, job) {
  const copies = Math.max(1, Number(job.copies) || 1);
  const color = !!job.color;
  const duplex = !!job.duplex;

  if (PRINT_CMD) {
    // User-supplied template; run through the shell-less exec by splitting.
    const filled = PRINT_CMD.replaceAll("{printer}", OS_PRINTER)
      .replaceAll("{file}", file)
      .replaceAll("{copies}", String(copies));
    const parts = filled.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    const [cmd, ...args] = parts.map((p) => p.replace(/^"|"$/g, ""));
    return [cmd, args];
  }

  if (process.platform === "win32") {
    // SumatraPDF: -print-settings "3x,color,duplexlong"
    const settings = [`${copies}x`, color ? "color" : "monochrome"];
    if (duplex) settings.push("duplexlong");
    return [
      SUMATRA_PATH,
      ["-print-to", OS_PRINTER, "-print-settings", settings.join(","), "-silent", file],
    ];
  }

  // Linux / macOS via CUPS `lp`.
  const args = ["-d", OS_PRINTER, "-n", String(copies)];
  args.push("-o", color ? "print-color-mode=color" : "print-color-mode=monochrome");
  args.push("-o", duplex ? "sides=two-sided-long-edge" : "sides=one-sided");
  args.push(file);
  return ["lp", args];
}

function runPrint(file, job) {
  const [cmd, args] = buildPrintCommand(file, job);
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { windowsHide: true }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr?.toString().trim() || err.message));
      resolve((stdout || "").toString().trim());
    });
  });
}

async function report(jobId, status, error) {
  try {
    const res = await fetch(`${APP_URL}/api/agent/jobs/${jobId}`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ status, error }),
    });
    if (!res.ok) log(`report ${status} failed: HTTP ${res.status}`);
  } catch (e) {
    log(`report ${status} error:`, e.message);
  }
}

async function handleJob(job) {
  log(`job ${job.id}: "${job.filename}" ×${job.copies}${job.color ? " color" : ""}${job.duplex ? " duplex" : ""}`);
  const tmp = path.join(os.tmpdir(), `khevlekh-${job.id}${extFor(job.filename, job.mimeType)}`);
  try {
    const res = await fetch(job.fileUrl, { headers: authHeaders });
    if (!res.ok) throw new Error(`download HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(tmp, buf);

    await runPrint(tmp, job);
    await report(job.id, "printed");
    log(`job ${job.id}: printed`);
  } catch (e) {
    log(`job ${job.id}: FAILED — ${e.message}`);
    await report(job.id, "failed", e.message);
  } finally {
    fs.unlink(tmp).catch(() => {});
  }
}

async function pollOnce() {
  const url = `${APP_URL}/api/agent/jobs?printerId=${encodeURIComponent(PRINTER_ID)}`;
  const res = await fetch(url, { headers: authHeaders });
  if (!res.ok) {
    if (res.status === 401) throw new Error("unauthorized — check AGENT_TOKEN");
    throw new Error(`poll HTTP ${res.status}`);
  }
  const { jobs } = await res.json();
  if (!jobs || jobs.length === 0) return;
  log(`claimed ${jobs.length} job(s)`);
  // Print sequentially so one printer isn't asked to run overlapping jobs.
  for (const job of jobs) await handleJob(job);
}

async function main() {
  log(`Khevlekh-Uul print agent starting`);
  log(`  app=${APP_URL} printer=${PRINTER_ID} os_printer=${OS_PRINTER} interval=${POLL_MS}ms`);
  // Simple loop with backoff on error; never overlap polls.
  for (;;) {
    try {
      await pollOnce();
    } catch (e) {
      log("poll error:", e.message);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main();
