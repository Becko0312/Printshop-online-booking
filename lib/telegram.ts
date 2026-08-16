// Minimal Telegram Bot API wrapper. Docs: https://core.telegram.org/bots/api
//
// Multi-tenant by design: each Printer stores its own (botToken, chatId), so
// the app posts to a different bot per merchant. No shared bot state.

const BASE = "https://api.telegram.org";

export class TelegramError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramError";
  }
}

// Post a file to a Telegram chat via sendDocument. Returns the Telegram
// message id — persisted on PrintJob so we can trace the print in n8n.
export async function sendDocument(input: {
  botToken: string;
  chatId: string;
  filename: string;
  mimeType: string;
  bytes: Buffer;
  caption?: string;
}): Promise<number> {
  if (!input.botToken) throw new TelegramError("Telegram bot token байхгүй байна.");
  if (!input.chatId) throw new TelegramError("Telegram chat id байхгүй байна.");

  const form = new FormData();
  form.append("chat_id", input.chatId);
  if (input.caption) form.append("caption", input.caption);
  // Node's Blob preserves the MIME type; Telegram uses it to detect PDFs.
  const blob = new Blob([new Uint8Array(input.bytes)], { type: input.mimeType });
  form.append("document", blob, input.filename);

  const res = await fetch(`${BASE}/bot${input.botToken}/sendDocument`, {
    method: "POST",
    body: form,
    cache: "no-store",
  });

  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    result?: { message_id?: number };
    description?: string;
    error_code?: number;
  };
  if (!res.ok || !json.ok) {
    const desc = json.description || res.statusText || "unknown";
    throw new TelegramError(`Telegram ${json.error_code ?? res.status}: ${desc}`);
  }
  return json.result?.message_id ?? 0;
}
