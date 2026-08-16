# Khevlekh Uul — Standalone Print Agent

A tiny, **zero-dependency** Node.js program that runs on your shop computer,
picks up print jobs from Khevlekh Uul, and prints them on your local printer.

It is the **self-hosted alternative to the PrintNode client**: you avoid the
per-print PrintNode fee, in exchange for running this small agent yourself.

> **One PC = one printer.** Each computer running the agent drives **one**
> server printer, identified by that printer's `PRINTER_KEY`. To add a second
> printer on a second computer, repeat the setup there with that printer's own
> key — see [§7 Connecting another PC](#7-connecting-another-pc).

---

## 1. Requirements

- **Node.js 18 or newer** — <https://nodejs.org> (uses the built-in `fetch`; no
  `npm install` is needed).
- A working printer that this computer can already print to.
- **Windows only:** [SumatraPDF](https://www.sumatrapdfreader.org) (portable
  build is fine). Linux/macOS use the built-in CUPS `lp` command — nothing to
  install.

---

## 2. What you need from the dashboard

Open your **merchant dashboard → Миний хэвлэгчид (My printers)**. You'll need:

| Value | Where | Goes in `.env` as |
| --- | --- | --- |
| Site URL | your Khevlekh Uul address | `API_BASE_URL` |
| **Agent token** | "Хэвлэгч холбох" → click **Agent токен үүсгэх** once | `AGENT_TOKEN` |
| **Printer key** | each printer card shows **Холбох түлхүүр** | `PRINTER_KEY` |

The **agent token is one per shop** (same on every PC). The **printer key is
per printer** (different on each PC).

---

## 3. Setup

1. Unzip this folder somewhere permanent, e.g. `C:\khevlekh-uul-agent` or
   `~/khevlekh-uul-agent`.
2. Copy `.env.example` → `.env`.
3. Fill in `.env`:
   - `API_BASE_URL` — your Khevlekh Uul site URL.
   - `AGENT_TOKEN` — from the dashboard.
   - `PRINTER_KEY` — the key of the printer this computer will drive.
   - `PRINTER_NAME` — optional; leave empty to use the default printer.
   - `SUMATRA_PATH` — Windows only; path to `SumatraPDF.exe`.
4. On the dashboard, open that printer and click **"Standalone-аар идэвхжүүлэх"**
   so customers can select it.
5. Start the agent:

   ```bash
   node agent.js
   ```

   You should see:

   ```
   Khevlekh Uul print agent started
     server : https://your-site
     key    : <printer key>
     printer: (system default)
     polling every 5s …
   ```

   Send a test print from the website — it should come out within a few seconds
   and the job on the dashboard should turn to **printed**.

---

## 4. Finding your OS printer name

Only needed if you set `PRINTER_NAME` (otherwise the default printer is used):

- **Linux / macOS:** `lpstat -p` lists the queue names.
- **Windows:** *Settings → Bluetooth & devices → Printers & scanners*.

---

## 5. Keep it running in the background

The agent must be running for prints to come through. Pick one:

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

## 6. How it works (server API contract)

The agent talks to your site over HTTPS, authenticating with `AGENT_TOKEN` as a
Bearer token, and only ever touches the printer named by `PRINTER_KEY`:

| Call | Purpose |
| --- | --- |
| `GET /api/agent/jobs?printer=<PRINTER_KEY>` | Claim queued jobs for this printer: `{ jobs: [{ id, filename, fileUrl, copies, color, duplex, printer }] }` |
| `GET /api/agent/jobs/{id}/file` | Download the file to print (token-protected). |
| `POST /api/agent/jobs/{id}` | Report a result: `{ "status": "printed" }` or `{ "status": "failed", "error": "…" }` |

The server **claims** each job (`queued → sent`) the moment it hands it out, so
the same job is never printed twice — even if two PCs share the printer key.

---

## 7. Connecting another PC

Say you have a second shop / second printer. On the **new computer**:

1. Install **Node.js 18+** (and SumatraPDF if it's Windows).
2. Copy this whole `print-agent` folder over (or download the `.zip` again from
   the dashboard and unzip it).
3. Copy `.env.example` → `.env` and fill it in:
   - `API_BASE_URL` — **same** as the first PC.
   - `AGENT_TOKEN` — **same** as the first PC (one token per shop).
   - `PRINTER_KEY` — **the new printer's own key** (each printer card on the
     dashboard shows its own key). ⚠️ This is the part that differs per PC —
     using the wrong key makes the wrong printer print.
   - `PRINTER_NAME` / `SUMATRA_PATH` — as needed for this computer.
4. On the dashboard, add the printer first if it isn't there yet
   (Миний хэвлэгчид → Хэвлэгч нэмэх), then open it and click
   **"Standalone-аар идэвхжүүлэх"**.
5. Run `node agent.js` and set it up as a background service (§5).

That's it. Each PC pulls only the jobs for its own `PRINTER_KEY`, so there's no
conflict or double printing between them.

> **Do not** reuse one PC's `.env` verbatim on another PC — you'd copy its
> `PRINTER_KEY` too and both would fight over the same printer. Only the
> `PRINTER_KEY` line must change per computer.

---

## 8. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `PRINTER_KEY is not set` | Copy the printer's "Холбох түлхүүр" from the dashboard into `.env`. |
| `Unauthorized — check AGENT_TOKEN` | Re-copy the agent token from the dashboard. |
| Agent runs but nothing prints | Make sure you clicked **"Standalone-аар идэвхжүүлэх"** on that printer, and the `PRINTER_KEY` matches it. |
| `lp not found` | Install CUPS (`sudo apt install cups-client` on Debian/Ubuntu). |
| `SUMATRA_PATH not set` | On Windows, install SumatraPDF and set its path in `.env`. |
| Prints to the wrong printer | Set `PRINTER_NAME` to the exact OS printer name, or fix `PRINTER_KEY`. |
| Wrong tray / duplex | Set defaults on the printer itself; the agent only requests standard options. |

---

Questions? Contact your Khevlekh Uul administrator.
