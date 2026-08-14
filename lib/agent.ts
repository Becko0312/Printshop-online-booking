// Local print agent (n8n) support. A shop-PC agent authenticates with a bearer
// token (PRINT_AGENT_TOKEN) and pulls queued "agent" jobs for its printer(s),
// downloads each file, prints locally, then reports status back.
//
// This is the self-hosted alternative to PrintNode: same PrintJob queue, but
// delivery happens on the merchant's machine instead of the PrintNode cloud.

function configuredToken(): string | null {
  return process.env.PRINT_AGENT_TOKEN || null;
}

export function isAgentConfigured(): boolean {
  return Boolean(configuredToken());
}

// Constant-time compare of the request's bearer token against PRINT_AGENT_TOKEN.
export function agentAuthorized(req: Request): boolean {
  const expected = configuredToken();
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  const provided = m ? m[1] : "";
  return timingSafeEq(provided, expected);
}

function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

// Duplex mapping shared with the PrintNode path's vocabulary.
export function duplexMode(duplex: boolean): "long-edge" | "one-sided" {
  return duplex ? "long-edge" : "one-sided";
}
