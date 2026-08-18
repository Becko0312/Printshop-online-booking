# Үүлэн Хэвлэл — Print Station Setup Manual (Linux)

**Merchant shop-PC installation guide (Linux)**
Version 1.0 · 2026-08

This is the Linux edition of [`MERCHANT-SETUP.md`](./MERCHANT-SETUP.md). It
turns a Linux PC (Ubuntu/Debian and derivatives; other distros work with the
equivalent package commands) with a printer into a fully automatic **print
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
                                  CUPS `lp` ► printer prints
                                        │
                                        ▼
                                  Bot replies "✅ printed job …"
```

Same architecture as on Windows; the only differences are the launcher script
(`start-print-station.sh` instead of the `.bat`), the print helper (the
built-in CUPS `lp` command — no SumatraPDF needed), and the working folder
(`~/uulen-print` instead of `C:\uulen-print`).

Every merchant runs their **own** independent stack: their own Telegram bot,
their own ngrok account/domain, their own n8n. Nothing is shared between
merchants.

## What you need before starting

| Item | Where |
|---|---|
| Linux PC (Ubuntu 22.04+ / Debian 12+ or similar) that stays on during business hours | shop |
| A working printer, installed in CUPS | shop |
| Internet connection | shop |
| A Telegram account (phone app is enough) | merchant |
| A merchant account on uulen.xyz | ask the Үүлэн Хэвлэл admin |
| The files `n8n-webapp-print.json` and `start-print-station.sh` | provided with this manual |

Estimated setup time: **45–60 minutes**.

---

## Step 1 — Install Node.js

n8n (the automation program) runs on Node.js. **Version 20 or newer is
required** (version 18 — the default on many distros — will NOT work).

Ubuntu/Debian, via NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

(Alternative: [nvm](https://github.com/nvm-sh/nvm) — `nvm install 22`. If you
use nvm, remember it only loads in interactive shells; the launcher script in
Step 6 must be run from a terminal where `node --version` works.)

Verify in a **new** terminal:

```bash
node --version
```

Must print `v20.x` or higher (e.g. `v22.19.0`).

---

## Step 2 — Install and check CUPS (the print system)

Linux prints through CUPS — no extra helper program is needed. On desktop
Ubuntu it is usually already installed; make sure with:

```bash
sudo apt-get install -y cups cups-client
sudo usermod -aG lpadmin $USER   # allow this user to manage printers; log out/in after
```

Add/verify the printer either in the system Settings → Printers, or in the
CUPS web UI at http://localhost:631 (Administration → Add Printer).

---

## Step 3 — Find the printer's exact CUPS name

```bash
lpstat -p -d
```

**Write down the exact name** (CUPS names have no spaces — e.g.
`HP_LaserJet_1020`). Confirm the printer works:

```bash
echo "test" | lp -d HP_LaserJet_1020
```

A page with the word *test* should come out. Check/clear the queue with
`lpstat -o` and `cancel -a` if needed.

---

## Step 4 — Create the working folder

Incoming files are saved here before printing:

```bash
mkdir -p ~/uulen-print
```

---

## Step 5 — Set up ngrok (the tunnel)

ngrok gives your PC a permanent public web address so the cloud app can reach
n8n. The **free plan is enough** — it includes one permanent (static) domain
per account.

1. Create a free account: https://dashboard.ngrok.com/signup
2. Install ngrok for Linux — https://ngrok.com/download has the current
   command for your distro/architecture; on Ubuntu/Debian the apt repository
   option is the easiest. Verify with `ngrok version`.
3. Get your authtoken: https://dashboard.ngrok.com/get-started/your-authtoken
   → copy it → in a terminal:

```bash
ngrok config add-authtoken <PASTE_YOUR_TOKEN_HERE>
```

4. Claim your free **static domain**: in the ngrok dashboard, go to
   **Universal Gateway → Domains** (or the "Your static domain" card on the
   start page) → it shows a domain like `example-name-here.ngrok-free.dev`.
   **Write it down** — this is this shop's permanent address.
5. Test the tunnel:

```bash
ngrok http --url=example-name-here.ngrok-free.dev 5678
```

(use YOUR domain). You should see `Session Status: online`. Press Ctrl+C to
stop for now.

> ⚠️ One static domain per ngrok account. Each shop PC needs its own free
> ngrok account.

---

## Step 6 — First start of n8n

1. Copy `start-print-station.sh` somewhere permanent (e.g. your home folder)
   and edit it: change the line

```
NGROK_DOMAIN="your-subdomain.ngrok-free.dev"
```

to YOUR static domain from Step 5. Save.

2. Make it executable and run it:

```bash
chmod +x ~/start-print-station.sh
~/start-print-station.sh
```

Unlike on Windows there is only **one** terminal: ngrok runs in the
background (its log goes to `~/uulen-print/ngrok.log`) and n8n runs in the
foreground. The first n8n start downloads packages — wait a few minutes until
you see `Editor is now accessible via:`.

3. Open http://localhost:5678 in a browser. Create the **owner account**
   (email + password — this is local to this PC; write the password down).

Keep the terminal open for the remaining steps.

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

In the JSON response find `"chat":{"id":  <number>` — that number is your
**chat id**. Write it down.

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
4. Open the **Save to disk** node → change **File Path and Name** from the
   Windows default to your Linux folder (replace `YOURNAME` with your
   username — check with `whoami`):

```
/home/YOURNAME/uulen-print/{{ $node["Webhook"].json.body.filename }}
```

5. Open the **Print** node → **replace the whole code** with the Linux
   version below, then edit the two marked lines (printer name from Step 3,
   folder from point 4):

```js
const { execSync } = require('child_process');

// ==== EDIT THESE TWO LINES FOR THIS PC =====================
const printer = 'HP_LaserJet_1020';        // name from: lpstat -p
const dir = '/home/YOURNAME/uulen-print';  // same folder as "Save to disk"
// ===========================================================

const body = $node["Webhook"].json.body;

const copies = body.copies || 1;
const color = body.color ? '' : ' -o print-color-mode=monochrome';
const duplex = body.duplex ? ' -o sides=two-sided-long-edge' : ' -o sides=one-sided';
const file = `${dir}/${body.filename}`;

const cmd = `lp -d "${printer}" -n ${copies}${color}${duplex} "${file}"`;
execSync(cmd);

return { jobId: body.jobId, chatId: body.chatId, printed: true };
```

6. Open the **Ack in chat** node → in the Credential dropdown select the
   Telegram credential you created in point 1 → close.
7. **Save** (Ctrl+S), then click **Publish** (top-right). If a "Production
   Checklist" popup appears, dismiss it — nothing in it is required.
8. Click the **Webhook** node and copy the **Production URL**. It looks like:

```
https://example-name-here.ngrok-free.dev/webhook/uulen-print
```

**Write it down** — you need it in the next step.

---

## Step 9 — Register the printer on uulen.xyz

1. Sign in at https://uulen.xyz as the **merchant**.
2. Go to **Миний хэвлэгчид** (My printers).
3. If the printer is not added yet: **Хэвлэгч нэмэх** — the **Хэвлэгч** name
   can be anything customers should see (it does not need to match CUPS).
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

1. Open a terminal and run `~/start-print-station.sh`.
2. Wait for the n8n output to show `Editor is now accessible via:` (ngrok is
   already up in the background — check `~/uulen-print/ngrok.log` if unsure).
3. **Keep the terminal open** while the shop operates. Nothing needs to be
   reconfigured — the domain, workflows, and credentials persist.

### Stopping (before shutting down the PC)

1. Check the printer is idle (optionally: n8n → **Executions** — no run in
   progress; `lpstat -o` shows an empty queue).
2. Press **Ctrl+C** in the terminal — the script stops n8n and the ngrok
   tunnel together.
3. Shut down normally.

Nothing breaks if the PC dies abruptly — workflows and settings live on disk
and survive.

### While the station is OFF

- Customers who choose this printer get an **automatic refund**: the cloud app
  detects the webhook is unreachable and returns their money immediately. No
  payments are lost and no jobs queue up.
- For long closures (holidays), ask the Үүлэн Хэвлэл admin to deactivate the
  printer so customers don't see it at all.

### Optional: start automatically on login

On a desktop (GNOME/KDE): add `start-print-station.sh` in **Startup
Applications** (GNOME: `gnome-session-properties` or Settings; KDE: System
Settings → Autostart).

Or as a systemd **user** service that survives logout
(`~/.config/systemd/user/uulen-print.service`):

```ini
[Unit]
Description=Uulen print station (ngrok + n8n)
After=network-online.target

[Service]
ExecStart=%h/start-print-station.sh
Restart=on-failure

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now uulen-print
sudo loginctl enable-linger $USER   # keep it running without an open session
```

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `node: command not found` | Node.js not installed (Step 1), or installed via nvm and this shell didn't load it — open a new terminal or run the script from an interactive shell. |
| n8n crashes with `File is not defined` | Node.js is v18 — install v20+ (Step 1), then clear the npx cache: `rm -rf ~/.npm/_npx` and retry. |
| `ERR_NGROK_3200 / endpoint offline` in browser | The station script is not running (or ngrok died — see `~/uulen-print/ngrok.log`). Restart `start-print-station.sh`. |
| ngrok shows a "You are about to visit" warning page | Normal for free-plan **browsers only**; click Visit Site. Webhooks are not affected. |
| n8n node error `access to env vars denied` or `Access to the file is not allowed` | n8n was started without the env vars — always start via `start-print-station.sh`, not plain `npx n8n`. |
| Code node error about `require` / `child_process` | Same as above — the script sets `NODE_FUNCTION_ALLOW_BUILTIN`. |
| File saves but printer silent | Test manually: `lp -d "PRINTER_NAME" ~/uulen-print/file.pdf`. Check the printer name (`lpstat -p`), the queue (`lpstat -o`), and that CUPS is running: `systemctl status cups`. |
| `lp: Error - The printer or class does not exist.` | Wrong printer name in the Print node — use the exact `lpstat -p` name (underscores, no spaces). |
| Print jobs stuck in the queue | `lpstat -o` shows them; clear with `cancel -a`, check the printer state with `lpstat -p` (it may be "disabled" — re-enable with `cupsenable PRINTER_NAME`). |
| Web app says `Telegram алдаа: n8n webhook 404` | Workflow not **Published**, or wrong webhook URL saved on the printer. Re-copy the Production URL from the Webhook node. |
| Web app says `Хэвлэгч Telegram-д тохируулагдаагүй` | Bot token / chat id missing on the printer — Step 9. |
| Bot never receives anything | Wrong bot token or chat id in the merchant form; re-do Step 7 and re-save. |
| Everything ran but wrong copies/color | Check the caption in the Telegram message vs. what the Print node received — open the failing execution in n8n → Executions. |

### Facts worth knowing

- **The bot cannot trigger printing by itself.** Telegram never delivers a
  bot's own messages back to that bot — that is why the app also calls the
  n8n webhook directly. The chat message is the record; the webhook is the
  trigger.
- `-o print-color-mode=monochrome` and `-o sides=two-sided-long-edge` are
  standard CUPS options, but some drivers use their own names. If color or
  duplex doesn't switch, run `lpoptions -p PRINTER_NAME -l` to list what the
  driver actually accepts and adjust the Print node command.
- Money flow: the customer's wallet is debited when the job is sent. If
  dispatch fails (webhook down, bad token), the app refunds automatically.
  If dispatch succeeded but paper jammed, handle it with the customer —
  the file is in the bot chat for reprinting.

---

## Quick reference card

```
Start station:        ~/start-print-station.sh   (Ctrl+C stops everything)
n8n editor:           http://localhost:5678
ngrok dashboard:      http://127.0.0.1:4040  (live request log)
ngrok log file:       ~/uulen-print/ngrok.log
Files land in:        ~/uulen-print
Webhook URL pattern:  https://<your-domain>.ngrok-free.dev/webhook/uulen-print
Check bot webhook:    https://api.telegram.org/bot<TOKEN>/getWebhookInfo
Printer names:        lpstat -p -d
Print queue:          lpstat -o        (clear: cancel -a)
Driver options:       lpoptions -p <name> -l
```
