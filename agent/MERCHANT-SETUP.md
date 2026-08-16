# Үүлэн Хэвлэл — Print Station Setup Manual

**Merchant shop-PC installation guide (Windows)**
Version 1.0 · 2026-08

This manual turns a Windows PC with a printer into a fully automatic **print
station** for the uulen.xyz cloud printing service. After setup, when a
customer pays and uploads a file on the website, the file prints on the shop's
printer within seconds — no human action needed.

## How it works

```
Customer (uulen.xyz)
      │  pays + uploads PDF
      ▼
Web app ──── file + job info ────► Telegram bot chat   (record / audit trail)
      │
      └───── webhook trigger ────► ngrok tunnel ► n8n on shop PC
                                        │ downloads file
                                        ▼
                                  SumatraPDF ► printer prints
                                        │
                                        ▼
                                  Bot replies "✅ printed job …"
```

Every merchant runs their **own** independent stack: their own Telegram bot,
their own ngrok account/domain, their own n8n. Nothing is shared between
merchants.

## What you need before starting

| Item | Where |
|---|---|
| Windows 10/11 PC that stays on during business hours | shop |
| A working printer, installed in Windows | shop |
| Internet connection | shop |
| A Telegram account (phone app is enough) | merchant |
| A merchant account on uulen.xyz | ask the Үүлэн Хэвлэл admin |
| The file `n8n-webapp-print.json` and `start-print-station.bat` | provided with this manual |

Estimated setup time: **45–60 minutes**.

---

## Step 1 — Install Node.js

n8n (the automation program) runs on Node.js. **Version 20 or newer is
required** (version 18 will NOT work).

1. Open https://nodejs.org/en/download in a browser.
2. Download the **Windows Installer (.msi), 64-bit, LTS version** (22.x).
3. Run the installer, accept all defaults, finish.
4. **Close every open PowerShell window**, then open a NEW one
   (Start → type "PowerShell" → Enter).
5. Verify:

```powershell
node --version
```

Must print `v20.x` or higher (e.g. `v22.19.0`).

**If PowerShell says "running scripts is disabled"** at any later step, run
this once and answer `Y`:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

---

## Step 2 — Install SumatraPDF (the print helper)

SumatraPDF is a small free program that prints PDFs from the command line.

1. Download from https://www.sumatrapdfreader.org/download-free-pdf-viewer
   (64-bit installer).
2. Run the installer with defaults.
3. Find where it was installed — in PowerShell:

```powershell
Get-ChildItem -Path "C:\Program Files","C:\Users\$env:USERNAME\AppData\Local" -Filter SumatraPDF.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
```

4. **Write down the full path** it prints (usually
   `C:\Users\<name>\AppData\Local\SumatraPDF\SumatraPDF.exe`).
   You will paste it into n8n in Step 8.

---

## Step 3 — Find the printer's exact Windows name

```powershell
Get-Printer | Select-Object Name
```

**Write down the exact name** of your printer (e.g. `HP LaserJet 1020`) —
capital letters and spaces matter. Confirm the printer works:

```powershell
"test" | Out-Printer -Name "HP LaserJet 1020"
```

A page with the word *test* should come out.

---

## Step 4 — Create the working folder

Incoming files are saved here before printing:

```powershell
New-Item -ItemType Directory -Force -Path "C:\uulen-print"
```

---

## Step 5 — Set up ngrok (the tunnel)

ngrok gives your PC a permanent public web address so the cloud app can reach
n8n. The **free plan is enough** — it includes one permanent (static) domain
per account.

1. Create a free account: https://dashboard.ngrok.com/signup
2. Download ngrok for Windows: https://ngrok.com/download — unzip it to
   `C:\ngrok\` and add that folder to PATH, **or** install via the MSI which
   does it for you.
3. Get your authtoken: https://dashboard.ngrok.com/get-started/your-authtoken
   → copy it → in PowerShell:

```powershell
ngrok config add-authtoken <PASTE_YOUR_TOKEN_HERE>
```

4. Claim your free **static domain**: in the ngrok dashboard, go to
   **Universal Gateway → Domains** (or the "Your static domain" card on the
   start page) → it shows a domain like `example-name-here.ngrok-free.dev`.
   **Write it down** — this is this shop's permanent address.
5. Test the tunnel:

```powershell
ngrok http --url=example-name-here.ngrok-free.dev 5678
```

(use YOUR domain). You should see `Session Status: online`. Press Ctrl+C to
stop for now.

> ⚠️ One static domain per ngrok account. Each shop PC needs its own free
> ngrok account.

---

## Step 6 — First start of n8n

1. Edit `start-print-station.bat` in Notepad: change the line

```
set NGROK_DOMAIN=your-subdomain.ngrok-free.dev
```

to YOUR static domain from Step 5. Save.

2. Double-click `start-print-station.bat`. Two windows open: the ngrok tunnel
   and n8n. The first n8n start downloads packages — wait a few minutes until
   you see `Editor is now accessible via:`.
3. Open http://localhost:5678 in a browser. Create the **owner account**
   (email + password — this is local to this PC; write the password down).

Keep both windows open for the remaining steps.

---

## Step 7 — Create the Telegram bot

1. In Telegram, search **@BotFather** → send `/newbot` → follow the prompts
   (pick any name; the username must end in `bot`, e.g. `myshop_print_bot`).
2. BotFather replies with a **token** like `123456789:AAE...` —
   **copy and save it**. Treat it like a password.
3. Open a chat with your new bot (search its @username) and send it any
   message, e.g. `hi`. (This step is required — a bot cannot message you
   first.)
4. Get your **chat id**: in a browser open (replace `<TOKEN>`):

```
https://api.telegram.org/bot<TOKEN>/getUpdates
```

In the JSON response find `"chat":{"id":  <number>` — that number (e.g.
`6836600484`) is your **chat id**. Write it down.

> If the result is empty `{"ok":true,"result":[]}`, send the bot another
> message and refresh the page.

---

## Step 8 — Import the print workflow into n8n

1. In n8n (http://localhost:5678): left menu **Credentials** → **Add
   credential** → search **Telegram API** → paste your bot **token** → Save.
2. Go to **Overview** → top-right **⋯** (or the workflow list) → **Import from
   File** → choose `n8n-webapp-print.json`.
3. The workflow "Uulen — Web app → Local print" opens with 5 nodes:
   `Webhook → Download file → Save to disk → Print → Ack in chat`.
4. Open the **Ack in chat** node → in the Credential dropdown select the
   Telegram credential you created in point 1 → close.
5. Open the **Print** node → at the top of the code, edit the two marked
   lines:
   - `sumatra` → the SumatraPDF path from Step 2
     (keep the double backslashes: `C:\\Users\\...\\SumatraPDF.exe`)
   - `printer` → the exact printer name from Step 3
6. **Save** (Ctrl+S), then click **Publish** (top-right). If a "Production
   Checklist" popup appears, dismiss it — nothing in it is required.
7. Click the **Webhook** node and copy the **Production URL**. It looks like:

```
https://example-name-here.ngrok-free.dev/webhook/uulen-print
```

**Write it down** — you need it in the next step.

---

## Step 9 — Register the printer on uulen.xyz

1. Sign in at https://uulen.xyz as the **merchant**.
2. Go to **Миний хэвлэгчид** (My printers).
3. If the printer is not added yet: **Хэвлэгч нэмэх** — the **Хэвлэгч** name
   can be anything customers should see (it does not need to match Windows).
4. Click **Засах** (Edit) on the printer and fill the Telegram section:

| Field | Value |
|---|---|
| Bot token | token from Step 7 |
| Chat ID | chat id from Step 7 |
| n8n Webhook URL | the Production URL from Step 8 |

5. **Хадгалах** (Save). The card should now show **Telegram холбогдсон**
   (green).

---

## Step 10 — Test

1. Sign in at uulen.xyz as a **customer** (any account with wallet balance).
2. **Хэвлэх** → upload a small PDF → choose this printer → **Хэвлэлт илгээх**
   → choose **Telegram / n8n**.
3. Within ~10 seconds, all of the following should happen:
   - the PDF appears in the bot's Telegram chat with a caption like
     `job:cm... copies:1 color:0 duplex:0`
   - the printer prints the pages
   - the bot replies `✅ printed job cm...`
4. In n8n → **Executions** (left menu) you should see a green run.

If all four happen — the station is live. 🎉

---

## Daily operation

### Starting (each morning / after any reboot)

1. Double-click `start-print-station.bat`.
2. Wait for the ngrok window to show `Session Status: online` and the n8n
   window to show `Editor is now accessible via:`.
3. **Keep both windows open** while the shop operates. Nothing needs to be
   reconfigured — the domain, workflows, and credentials persist.

### Stopping (before shutting down the PC)

1. Check the printer is idle (optionally: n8n → **Executions** — no run in
   progress).
2. Close the **n8n** window (Ctrl+C inside it, or the window's X).
3. Close the **ngrok** window the same way.
4. Shut down Windows normally.

Order doesn't strictly matter and nothing breaks if the PC dies abruptly —
workflows and settings live on disk and survive.

### While the station is OFF

- Customers who choose this printer get an **automatic refund**: the cloud app
  detects the webhook is unreachable and returns their money immediately. No
  payments are lost and no jobs queue up.
- For long closures (holidays), ask the Үүлэн Хэвлэл admin to deactivate the
  printer so customers don't see it at all.

### Optional: start automatically when the PC boots

1. Press `Win+R` → type `shell:startup` → Enter — a folder opens.
2. Right-click inside → New → Shortcut → browse to
   `start-print-station.bat` → finish.

Now the station starts whenever the PC logs in.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `node : not recognized` | Node.js not installed, or PowerShell window predates the install — open a new window. |
| `running scripts is disabled` | Run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`, answer Y. |
| n8n crashes with `File is not defined` | Node.js is v18 — install v20+ (Step 1), then delete the npx cache: `Remove-Item -Recurse -Force "$env:LOCALAPPDATA\npm-cache\_npx"` and retry. |
| `ERR_NGROK_3200 / endpoint offline` in browser | ngrok window closed — restart `start-print-station.bat`. |
| ngrok shows a "You are about to visit" warning page | Normal for free-plan **browsers only**; click Visit Site. Webhooks are not affected. |
| n8n node error `access to env vars denied` or `Access to the file is not allowed` | n8n was started without the env vars — always start via `start-print-station.bat`, not plain `npx n8n`. |
| Code node error about `require` / `child_process` | Same as above — the bat file sets `NODE_FUNCTION_ALLOW_BUILTIN`. |
| File saves but printer silent | Test manually: `"C:\...\SumatraPDF.exe" -print-to "PRINTER NAME" "C:\uulen-print\file.pdf"`. Check printer name (Step 3), check Windows print queue: `Get-PrintJob -PrinterName "..."`. |
| Web app says `Telegram алдаа: n8n webhook 404` | Workflow not **Published**, or wrong webhook URL saved on the printer. Re-copy the Production URL from the Webhook node. |
| Web app says `Хэвлэгч Telegram-д тохируулагдаагүй` | Bot token / chat id missing on the printer — Step 9. |
| Bot never receives anything | Wrong bot token or chat id in the merchant form; re-do Step 7 and re-save. |
| Everything ran but wrong copies/color | Check the caption in the Telegram message vs. what the Print node received — open the failing execution in n8n → Executions. |

### Facts worth knowing

- **The bot cannot trigger printing by itself.** Telegram never delivers a
  bot's own messages back to that bot — that is why the app also calls the
  n8n webhook directly. The chat message is the record; the webhook is the
  trigger.
- Files that a **person** forwards to the bot from their own account CAN
  trigger a separate Telegram-Trigger workflow (optional, not covered here).
- Money flow: the customer's wallet is debited when the job is sent. If
  dispatch fails (webhook down, bad token), the app refunds automatically.
  If dispatch succeeded but paper jammed, handle it with the customer —
  the file is in the bot chat for reprinting.

---

## Quick reference card

```
Start station:        double-click start-print-station.bat
n8n editor:           http://localhost:5678
ngrok dashboard:      http://127.0.0.1:4040  (live request log)
Files land in:        C:\uulen-print
Webhook URL pattern:  https://<your-domain>.ngrok-free.dev/webhook/uulen-print
Check bot webhook:    https://api.telegram.org/bot<TOKEN>/getWebhookInfo
Printer names:        Get-Printer | Select-Object Name
Print queue:          Get-PrintJob -PrinterName "<name>"
```
