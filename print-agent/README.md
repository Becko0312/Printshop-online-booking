# Khevlekh Uul — Standalone Print Agent

A tiny, **zero-dependency** Node.js program that runs on your shop computer,
picks up print jobs from Khevlekh Uul, and prints them on your local printer.

It is the **self-hosted alternative to the PrintNode client**: you avoid the
per-print PrintNode fee, in exchange for running this small agent yourself.

---

## 1. Requirements

- **Node.js 18 or newer** — <https://nodejs.org> (uses the built-in `fetch`; no
  `npm install` is needed).
- A working printer that your computer can already print to.
- **Windows only:** [SumatraPDF](https://www.sumatrapdfreader.org) (portable
  build is fine). Linux/macOS use the built-in CUPS `lp` command — nothing to
  install.

---

## 2. Setup

1. Unzip this folder somewhere permanent, e.g. `C:\khevlekh-uul-agent` or
   `~/khevlekh-uul-agent`.
2. Copy `.env.example` → `.env`.
3. Open `.env` and fill in:
   - `API_BASE_URL` — your Khevlekh Uul site URL.
   - `AGENT_TOKEN` — copy it from your **merchant dashboard → "Хэвлэгч холбох"**.
   - `PRINTER_NAME` — optional; leave empty to use the default printer.
   - `SUMATRA_PATH` — Windows only; path to `SumatraPDF.exe`.
4. Start it:

   ```bash
   node agent.js
   ```

   You should see `Khevlekh Uul print agent started` and it will begin polling.
   Send a test print from the website — it should come out of your printer
   within a few seconds.

---

## 3. Finding your printer name

- **Linux / macOS:** `lpstat -p` lists the queue names.
- **Windows:** *Settings → Bluetooth & devices → Printers & scanners* shows the
  exact name to put in `PRINTER_NAME`.

---

## 4. Keep it running in the background

The agent must be running for prints to come through. Options:

### Windows (Task Scheduler)
Create a task that runs `node C:\khevlekh-uul-agent\agent.js` **at log on**, with
"Run whether user is logged on or not" enabled.

### Linux (systemd)
Create `/etc/systemd/system/khevlekh-agent.service`:

```ini
[Unit]
Description=Khevlekh Uul Print Agent
After=network-online.target

[Service]
WorkingDirectory=/home/USER/khevlekh-uul-agent
ExecStart=/usr/bin/node agent.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Then: `sudo systemctl enable --now khevlekh-agent`.

### Any OS (pm2)
```bash
npm install -g pm2
pm2 start agent.js --name khevlekh-agent
pm2 save && pm2 startup
```

---

## 5. How it works (server API contract)

The agent talks to your Khevlekh Uul site over HTTPS, authenticating with the
`AGENT_TOKEN` as a Bearer token:

| Call | Purpose |
| --- | --- |
| `GET /api/agent/jobs` | Returns queued jobs for your printer(s): `{ jobs: [{ id, filename, fileUrl, copies, color, duplex, printer }] }` |
| `POST /api/agent/jobs/{id}` | Reports a result: body `{ "status": "printed" }` or `{ "status": "failed", "error": "…" }` |

For each job the agent downloads `fileUrl`, prints it with the right options
(copies, duplex, color), then reports the outcome so the job status updates on
the dashboard.

---

## 6. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Unauthorized — check AGENT_TOKEN` | Re-copy the token from the dashboard into `.env`. |
| `lp not found` | Install CUPS (`sudo apt install cups-client` on Debian/Ubuntu). |
| `SUMATRA_PATH not set` | On Windows, install SumatraPDF and set its path in `.env`. |
| Nothing prints, no errors | Confirm `PRINTER_NAME` matches exactly, or leave it empty to use the default. |
| Prints but wrong tray/duplex | Set defaults on the printer itself; the agent only requests standard options. |

---

Questions? Contact your Khevlekh Uul administrator.
