@echo off
REM =========================================================
REM  Uulen Print Station launcher
REM  EDIT THE LINE BELOW: your ngrok static domain (no https://)
REM =========================================================
set NGROK_DOMAIN=your-subdomain.ngrok-free.dev

REM ---- do not edit below this line ------------------------
if not exist "C:\uulen-print" mkdir "C:\uulen-print"

start "ngrok tunnel" cmd /k ngrok http --url=%NGROK_DOMAIN% 5678

set NODE_FUNCTION_ALLOW_BUILTIN=fs,path,child_process
set N8N_RESTRICT_FILE_ACCESS_TO=C:\uulen-print
set WEBHOOK_URL=https://%NGROK_DOMAIN%/

echo.
echo  Print station starting...
echo  ngrok:   https://%NGROK_DOMAIN%
echo  n8n:     http://localhost:5678
echo  Keep BOTH windows open while the shop is operating.
echo.

npx n8n
