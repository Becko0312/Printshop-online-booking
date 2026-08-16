#!/usr/bin/env node
// Khevlekh Uul — Standalone Print Agent
// =============================================================================
// A zero-dependency Node.js agent that runs on the shop computer, polls the
// Khevlekh Uul server for queued print jobs assigned to this shop's printer(s),
// downloads each file, and prints it on the locally installed printer using the
// operating system's native print command:
//
//   * Linux / macOS  → CUPS `lp`
//   * Windows        → SumatraPDF CLI  (set SUMATRA_PATH in .env)
//
// It then reports each job's result (printed / failed) back to the server.
//
// This is the self-hosted alternative to the PrintNode client: no per-print
// PrintNode fee, at the cost of running this small agent yourself.
//
// Requirements: Node.js 18 or newer (uses the built-in global `fetch`).
//               NO `npm install` is needed — this file has zero dependencies.
//
// Setup:
//   1. Copy `.env.example` to `.env`.
//   2. Fill in API_BASE_URL and AGENT_TOKEN (both shown on your merchant
//      dashboard → "Хэвлэгч холбох").
//   3. Run:  node agent.js
//
// See README.md for running it permanently as a background service.
// =============================================================================

"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

// -----------------------------------------------------------------------------
// Minimal .env loader (so the agent stays dependency-free). Lines look like
// KEY=value; blank lines and lines starting with `#` are ignored. Values may be
// optionally wrapped in single or double quotes.
// -----------------------------------------------------------------------------
function loadEnv() {
  const file = path.join(__dirname, ".env");
  if (!fs.existsSync(file)) return;
  for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnv();

const CONFIG = {
  apiBaseUrl: (process.env.API_BASE_URL || "").replace(/\/$/, ""),
  agentToken: process.env.AGENT_TOKEN || "",
  // Which server-side printer this PC drives. Copy the printer's
  // "Холбох түлхүүр" (PRINTER_KEY) from your merchant dashboard. This is what
  // lets each PC pull only its own printer's jobs — no double printing.
  printerKey: process.env.PRINTER_KEY || "",
  // Optional: force a specific OS printer name/queue. Empty = system default.
  printerName: process.env.PRINTER_NAME || "",
  // How often to check for new jobs, in seconds.
  pollSeconds: Math.max(3, Number(process.env.POLL_SECONDS || 5)),
  // Windows only: absolute path to SumatraPDF.exe (portable build is fine).
  sumatraPath: process.env.SUMATRA_PATH || "",
};

function fail(msg) {
  console.error(`\n[config] ${msg}\n`);
  process.exit(1);
}

if (!CONFIG.apiBaseUrl) fail("API_BASE_URL is not set in .env");
if (!CONFIG.agentToken) fail("AGENT_TOKEN is not set in .env");
if (!CONFIG.printerKey) fail("PRINTER_KEY is not set in .env");
if (typeof fetch !== "function") {
  fail("This agent needs Node.js 18+ (global fetch is missing).");
}

const IS_WINDOWS = os.platform() === "win32";
const TMP_DIR = path.join(os.tmpdir(), "khevlekh-uul-agent");
fs.mkdirSync(TMP_DIR, { recursive: true });

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

// -----------------------------------------------------------------------------
// Server API
//   GET  {base}/api/agent/jobs        -> { jobs: [ Job ] }
//   POST {base}/api/agent/jobs/{id}   body { status, error? }
// Job = { id, filename, fileUrl, copies, color, duplex, printer }
// -----------------------------------------------------------------------------
function authHeaders(extra) {
  return { Authorization: `Bearer ${CONFIG.agentToken}`, ...(extra || {}) };
}

async function fetchJobs() {
  const url =
    `${CONFIG.apiBaseUrl}/api/agent/jobs?printer=` +
    encodeURIComponent(CONFIG.printerKey);
  const res = await fetch(url, { headers: authHeaders() });
  if (res.status === 401) {
    throw new Error("Unauthorized — check AGENT_TOKEN in .env");
  }
  if (!res.ok) {
    throw new Error(`GET /api/agent/jobs -> ${res.status} ${await safeText(res)}`);
  }
  const data = await res.json();
  return Array.isArray(data.jobs) ? data.jobs : [];
}

async function reportStatus(jobId, status, error) {
  try {
    await fetch(`${CONFIG.apiBaseUrl}/api/agent/jobs/${encodeURIComponent(jobId)}`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ status, error: error ? String(error).slice(0, 500) : undefined }),
    });
  } catch (e) {
    log(`  ! failed to report status for job ${jobId}:`, e.message);
  }
}

async function safeText(res) {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return "";
  }
}

// -----------------------------------------------------------------------------
// Download the job's file into a temp path.
// -----------------------------------------------------------------------------
async function downloadFile(job) {
  const res = await fetch(job.fileUrl, { headers: authHeaders() });
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const safeName = (job.filename || `${job.id}.pdf`).replace(/[^\w.\-]+/g, "_");
  const dest = path.join(TMP_DIR, `${job.id}-${safeName}`);
  fs.writeFileSync(dest, buf);
  return dest;
}

// -----------------------------------------------------------------------------
// Build and run the OS print command. Returns { ok, error }.
// -----------------------------------------------------------------------------
function printFile(filePath, job) {
  return IS_WINDOWS ? printWindows(filePath, job) : printCups(filePath, job);
}

// Linux / macOS via CUPS `lp`.
function printCups(filePath, job) {
  const args = [];
  if (CONFIG.printerName) args.push("-d", CONFIG.printerName);
  if (job.copies && job.copies > 1) args.push("-n", String(job.copies));
  // Duplex + color options.
  args.push("-o", job.duplex ? "sides=two-sided-long-edge" : "sides=one-sided");
  if (!job.color) args.push("-o", "ColorModel=Gray");
  args.push(filePath);

  const r = spawnSync("lp", args, { encoding: "utf8" });
  if (r.error) return { ok: false, error: `lp not found (install CUPS): ${r.error.message}` };
  if (r.status !== 0) return { ok: false, error: (r.stderr || r.stdout || "lp failed").trim() };
  return { ok: true };
}

// Windows via SumatraPDF CLI.
function printWindows(filePath, job) {
  if (!CONFIG.sumatraPath) {
    return { ok: false, error: "SUMATRA_PATH not set (needed to print on Windows)" };
  }
  const settings = [];
  if (job.copies && job.copies > 1) settings.push(`${job.copies}x`);
  settings.push(job.duplex ? "duplexlong" : "simplex");
  if (!job.color) settings.push("monochrome");

  const args = [];
  if (CONFIG.printerName) {
    args.push("-print-to", CONFIG.printerName);
  } else {
    args.push("-print-to-default");
  }
  args.push("-print-settings", settings.join(","), "-silent", filePath);

  const r = spawnSync(CONFIG.sumatraPath, args, { encoding: "utf8" });
  if (r.error) return { ok: false, error: `SumatraPDF failed: ${r.error.message}` };
  if (r.status !== 0) return { ok: false, error: (r.stderr || r.stdout || "SumatraPDF failed").trim() };
  return { ok: true };
}

// -----------------------------------------------------------------------------
// Process a single job end-to-end.
// -----------------------------------------------------------------------------
async function processJob(job) {
  log(`> job ${job.id}: "${job.filename}" ×${job.copies || 1}${job.color ? " color" : ""}${job.duplex ? " duplex" : ""}`);
  let filePath;
  try {
    filePath = await downloadFile(job);
  } catch (e) {
    log(`  x download error:`, e.message);
    await reportStatus(job.id, "failed", e.message);
    return;
  }

  const result = printFile(filePath, job);
  try {
    fs.unlinkSync(filePath);
  } catch {
    /* best-effort cleanup */
  }

  if (result.ok) {
    log(`  ✓ printed`);
    await reportStatus(job.id, "printed");
  } else {
    log(`  x print error:`, result.error);
    await reportStatus(job.id, "failed", result.error);
  }
}

// -----------------------------------------------------------------------------
// Main polling loop. Processes jobs one at a time (a single printer is the
// common case). Backs off on server errors so a brief outage isn't a hot loop.
// -----------------------------------------------------------------------------
const seen = new Set();
let backoff = 0;

async function tick() {
  try {
    const jobs = await fetchJobs();
    backoff = 0;
    for (const job of jobs) {
      if (seen.has(job.id)) continue;
      seen.add(job.id);
      await processJob(job);
    }
    // Keep `seen` from growing forever.
    if (seen.size > 500) seen.clear();
  } catch (e) {
    backoff = Math.min(backoff + 1, 6);
    log(`! poll error (${e.message}); backing off ${backoff * CONFIG.pollSeconds}s`);
  }
  const delay = (CONFIG.pollSeconds + backoff * CONFIG.pollSeconds) * 1000;
  setTimeout(tick, delay);
}

log(`Khevlekh Uul print agent started`);
log(`  server : ${CONFIG.apiBaseUrl}`);
log(`  key    : ${CONFIG.printerKey}`);
log(`  printer: ${CONFIG.printerName || "(system default)"}`);
log(`  os     : ${os.platform()} / ${IS_WINDOWS ? "SumatraPDF" : "CUPS lp"}`);
log(`  polling every ${CONFIG.pollSeconds}s …`);
tick();
