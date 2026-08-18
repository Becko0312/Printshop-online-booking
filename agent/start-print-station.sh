#!/usr/bin/env bash
# =========================================================
#  Uulen Print Station launcher (Linux)
#  EDIT THE LINE BELOW: your ngrok static domain (no https://)
# =========================================================
NGROK_DOMAIN="your-subdomain.ngrok-free.dev"

# ---- do not edit below this line ------------------------
set -u

PRINT_DIR="$HOME/uulen-print"
mkdir -p "$PRINT_DIR"

# ngrok runs in the background; its output goes to a log file.
ngrok http --url="$NGROK_DOMAIN" 5678 --log=stdout >"$PRINT_DIR/ngrok.log" 2>&1 &
NGROK_PID=$!
trap 'kill "$NGROK_PID" 2>/dev/null' EXIT

export NODE_FUNCTION_ALLOW_BUILTIN=fs,path,child_process
export N8N_RESTRICT_FILE_ACCESS_TO="$PRINT_DIR"
export WEBHOOK_URL="https://$NGROK_DOMAIN/"

echo
echo "  Print station starting..."
echo "  ngrok:   https://$NGROK_DOMAIN   (log: $PRINT_DIR/ngrok.log)"
echo "  n8n:     http://localhost:5678"
echo "  Keep this terminal open while the shop is operating."
echo "  Ctrl+C stops both n8n and the ngrok tunnel."
echo

# Version is pinned: running an OLDER n8n against a database created by a
# newer one can corrupt it. Bump deliberately, never by accident.
npx -y n8n@2.34.6
