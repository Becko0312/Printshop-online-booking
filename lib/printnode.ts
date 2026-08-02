// Minimal PrintNode REST wrapper. Docs: https://www.printnode.com/en/docs/api
//
// Auth: HTTP Basic with API key as username, empty password.
// Base: https://api.printnode.com

const BASE = "https://api.printnode.com";

function authHeader(): string {
  const key = process.env.PRINTNODE_API_KEY;
  if (!key) throw new Error("PRINTNODE_API_KEY is not configured.");
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
      ...(init?.headers ?? {}),
    },
    // PrintNode is a live API; never cache
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PrintNode ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export type PrintNodePrinter = {
  id: number;
  name: string;
  description: string;
  state: string; // "online" | "offline" | ...
  computer: { id: number; name: string; state: string };
  capabilities?: {
    color?: boolean;
    duplex?: boolean;
    copies?: number;
    supported_options?: unknown;
  };
};

export async function listPrinters(): Promise<PrintNodePrinter[]> {
  return req<PrintNodePrinter[]>("/printers");
}

export type CreatePrintJobInput = {
  printerId: number;
  title: string;
  contentType: "pdf_base64" | "raw_base64" | "pdf_uri" | "raw_uri";
  content: string;
  source: string;
  options?: {
    copies?: number;
    color?: boolean;
    duplex?: "long-edge" | "short-edge" | "one-sided";
  };
};

// Returns the numeric PrintNode job id.
export async function createPrintJob(input: CreatePrintJobInput): Promise<number> {
  const body = {
    printerId: input.printerId,
    title: input.title,
    contentType: input.contentType,
    content: input.content,
    source: input.source,
    options: input.options,
  };
  const out = await req<number>("/printjobs", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return out;
}
