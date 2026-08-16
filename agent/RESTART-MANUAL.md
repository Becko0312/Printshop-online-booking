# Print Station — Manual Start Guide

**Step-by-step commands after every computer restart (no .bat file needed)**
Үүлэн Хэвлэл · uulen.xyz

---

## Step 1 — Start ngrok (Window 1)

Open PowerShell (Start → type `powershell` → Enter) and run:

```powershell
ngrok http --url=campfire-swifter-whooping.ngrok-free.dev 5678
```

Wait until you see:

```
Session Status                online
Forwarding                    https://campfire-swifter-whooping.ngrok-free.dev -> http://localhost:5678
```

⚠️ **Leave this window open. Do not close it.**

---

## Step 2 — Start n8n (Window 2)

Open a **second** PowerShell window and run this single line:

```powershell
$env:NODE_FUNCTION_ALLOW_BUILTIN="fs,path,child_process"; $env:N8N_RESTRICT_FILE_ACCESS_TO="C:\uulen-print;C:\Users\nonos\uulen-print"; $env:WEBHOOK_URL="https://campfire-swifter-whooping.ngrok-free.dev/"; npx -y n8n@2.34.6
```

Wait (15–30 seconds after first-time install) until you see:

```
Editor is now accessible via:
```

⚠️ **Leave this window open too.**

---

## Step 3 — Verify (optional but recommended)

1. Open http://localhost:5678 — the n8n editor loads and both workflows show
   **Published**.
2. Send a test PDF to your bot from your own Telegram account — the printer
   should print it and the bot replies `✅ printed job`.

✅ **The station is now live.** Customer jobs from uulen.xyz print
automatically. The two open windows ARE the system — closing either one takes
the station offline.

---

## Stopping (before PC shutdown)

1. Check the printer is idle.
2. Window 2 (n8n): press **Ctrl+C**, then close the window.
3. Window 1 (ngrok): press **Ctrl+C**, then close the window.
4. Shut down Windows normally.

### While the station is off

- Customers who try to print get an **automatic refund** — no payments are
  lost and no jobs queue up.
- A file in the bot chat **without** a `✅ printed job` reply below it means
  that customer was refunded — do **not** print it manually unless they pay
  again.

---

## If something fails

| Problem | Fix |
|---|---|
| `node : not recognized` | Open a NEW PowerShell window; verify `node --version` prints v24.x |
| `running scripts is disabled` | Run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`, answer `Y` |
| ngrok: `endpoint already online` (ERR_NGROK_334) | A previous ngrok is still running. Run `taskkill /F /IM ngrok.exe`, then repeat Step 1 |
| ngrok: `custom subdomains` error (ERR_NGROK_313) | The domain in the command is wrong — it must be exactly your claimed static domain |
| n8n: `Cannot find module ...` | Corrupted install. Run `Remove-Item -Recurse -Force "$env:LOCALAPPDATA\npm-cache\_npx"`, then repeat Step 2 |
| n8n: `File is not defined` crash | Node is v18 in this window. Run `nvm use 24.19.0`, open a new window, retry |
| Web app shows `Telegram алдаа: n8n webhook ...` | One of the two windows is closed, or ngrok is not `online` — restart from Step 1 |
| File saved but printer silent | Test SumatraPDF directly: `& "C:\Users\nonos\AppData\Local\SumatraPDF\SumatraPDF.exe" -print-to "HP LaserJet 1020" "C:\uulen-print\<file>.pdf"` |

---

## Quick reference

```
n8n editor:           http://localhost:5678
ngrok request log:    http://127.0.0.1:4040
Public address:       https://campfire-swifter-whooping.ngrok-free.dev
Webhook URL (app):    https://campfire-swifter-whooping.ngrok-free.dev/webhook/uulen-print
Files land in:        C:\uulen-print  (and C:\Users\nonos\uulen-print)
Check bot webhook:    https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```
