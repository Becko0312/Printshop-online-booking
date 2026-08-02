// Very small, dependency-free PDF page counter. Not perfect but works for the
// vast majority of PDFs users will upload. For non-PDF files we return null and
// the UI asks the user to enter page count manually.
export function countPdfPages(buf: Buffer): number | null {
  try {
    // Fast path: count /Type /Page (but not /Pages) via a regex on the raw text.
    // PDFs are usually mostly ASCII header + compressed streams; the counter
    // walks bytes so it works on either.
    const text = buf.toString("latin1");
    const matches = text.match(/\/Type\s*\/Page(?![a-zA-Z])/g);
    if (matches && matches.length > 0) return matches.length;
    // Fallback: look for /Count in the /Pages root object.
    const m = text.match(/\/Count\s+(\d+)/);
    if (m) return Number(m[1]);
    return null;
  } catch {
    return null;
  }
}
