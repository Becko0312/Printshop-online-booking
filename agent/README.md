# Khevlekh-Uul local print agent

A tiny Node.js agent that runs on a **merchant's shop PC** and prints jobs
locally — the self-hosted alternative to PrintNode. No PrintNode subscription,
no n8n. It polls the cloud for jobs the customer sent to **"Local agent"**,
downloads each file, prints it on the local printer, and reports the result.

```
Website ──(job queued, method=agent)──► DB
                                          ▲ poll+claim   │ file
  shop PC:  print-agent.mjs  ─────────────┘              ▼
                                        lp / SumatraPDF ──► printer
                                          │ report printed/failed
                                          ▼
                                         DB (refund on failure)
```

## Requirements

- **Node.js 18+** on the shop PC (`node --version`).
- A working printer installed in the OS.
- **Windows only:** [SumatraPDF](https://www.sumatrapdfreader.org/) (portable
  `.exe` is fine). Linux/macOS use the built-in CUPS `lp`.

## 1. Get the two IDs you need

- **PRINTER_ID** — the app's printer id. Open the app → Printers, or ask the
  admin. It's the internal id of the printer this PC serves (a `c…` string).
- **OS_PRINTER** — the printer's name **as the operating system sees it**:
  - Linux/macOS: `lpstat -p` (e.g. `HP_LaserJet_1020`)
  - Windows: Settings → Printers, or PowerShell `Get-Printer` (e.g. `HP LaserJet 1020`)

The **AGENT_TOKEN** is the server's `PRINT_AGENT_TOKEN` value — get it from
whoever runs the deployment.

## 2. Run it

Linux / macOS:

```bash
AGENT_TOKEN="agent_xxxxxxxx" \
PRINTER_ID="cxxxxxxxxxxxxxxxxxxxxxxxx" \
OS_PRINTER="HP_LaserJet_1020" \
node agent/print-agent.mjs
```

Windows (PowerShell):

```powershell
$env:AGENT_TOKEN="agent_xxxxxxxx"
$env:PRINTER_ID="cxxxxxxxxxxxxxxxxxxxxxxxx"
$env:OS_PRINTER="HP LaserJet 1020"
$env:SUMATRA_PATH="C:\Tools\SumatraPDF.exe"   # if not on PATH
node agent\print-agent.mjs
```

You should see `claimed N job(s)` lines when customers print to "Local agent".

## Configuration (environment variables)

| Var | Required | Default | Notes |
|-----|----------|---------|-------|
| `AGENT_TOKEN` | ✅ | — | Must equal the server's `PRINT_AGENT_TOKEN`. |
| `PRINTER_ID` | ✅ | — | App printer id. Comma-separate to serve several from one PC. |
| `OS_PRINTER` | ✅ | — | Printer name as the OS knows it. |
| `APP_URL` | | `https://cloud-printing-saas.vercel.app` | App base URL. |
| `POLL_MS` | | `5000` | Poll interval. |
| `SUMATRA_PATH` | | `SumatraPDF.exe` | Windows print helper path. |
| `PRINT_CMD` | | — | Override the print command. Placeholders: `{printer}` `{file}` `{copies}`. |

Default print commands:
- **Linux/macOS:** `lp -d "<OS_PRINTER>" -n <copies> -o print-color-mode=… -o sides=… <file>`
- **Windows:** `SumatraPDF.exe -print-to "<OS_PRINTER>" -print-settings "<copies>x,color|monochrome[,duplexlong]" -silent <file>`

If your driver needs different flags, set `PRINT_CMD`, e.g.:

```bash
PRINT_CMD='lp -d {printer} -n {copies} -o media=A4 {file}'
```

## 3. Keep it running (as a service)

- **Linux (systemd):** create a unit that runs the `node` command above with
  `Restart=always` and your env in `Environment=` lines.
- **Windows:** use [NSSM](https://nssm.cc/) to install `node agent\print-agent.mjs`
  as a service, or `pm2` + `pm2-startup`.
- **Cross-platform quick option:** `npm i -g pm2 && pm2 start agent/print-agent.mjs && pm2 save`
  (set the env vars first).

## How it maps to the app

- Customer picks **Local agent** on the upload page → the job is created with
  `deliveryMethod=agent`, `status=queued` (wallet already debited).
- Agent `GET /api/agent/jobs?printerId=…` claims queued jobs (`queued→sent`).
- Agent downloads `GET /api/agent/jobs/:id/file`, prints, then
  `POST /api/agent/jobs/:id { status: "printed" | "failed" }`.
- On `failed`, the server refunds the wallet automatically.

All three endpoints require `Authorization: Bearer <AGENT_TOKEN>`.

> **Security note (MVP):** one shared `PRINT_AGENT_TOKEN` grants access to any
> printer's jobs. For a multi-merchant rollout, move to a per-printer token so a
> shop PC can only fetch its own jobs.
