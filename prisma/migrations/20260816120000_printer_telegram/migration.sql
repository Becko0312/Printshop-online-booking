-- Add Telegram / n8n delivery config to Printer.
ALTER TABLE "Printer" ADD COLUMN "telegramBotToken" TEXT;
ALTER TABLE "Printer" ADD COLUMN "telegramChatId" TEXT;
