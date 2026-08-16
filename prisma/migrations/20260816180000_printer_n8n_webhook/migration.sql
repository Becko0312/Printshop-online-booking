-- n8n webhook target for the Telegram delivery path. The app POSTs the job
-- (file URL + options) here; Telegram sendDocument alone can't trigger the
-- merchant workflow because bots never receive their own messages.
ALTER TABLE "Printer" ADD COLUMN "n8nWebhookUrl" TEXT;
