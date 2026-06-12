/**
 * Parse a date in the formats Czech/Slovak banks emit:
 *   "DD.MM.YYYY", "D.M.YYYY", "YYYY-MM-DD", "DD/MM/YYYY", "DD.MM.YY".
 * Returns a Date at UTC midnight of that calendar day, or null.
 */
export function parseDate(raw: string | null | undefined): Date | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // ISO: YYYY-MM-DD (optionally with time — take the date part).
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return utc(+m[1]!, +m[2]!, +m[3]!);

  // Czech: D.M.YYYY or DD.MM.YYYY (optionally trailing time/zone).
  m = s.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{2,4})/);
  if (m) return utc(normYear(+m[3]!), +m[2]!, +m[1]!);

  // Slash: DD/MM/YYYY.
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) return utc(normYear(+m[3]!), +m[2]!, +m[1]!);

  return null;
}

/** Parse the ABO/GPC compact date `DDMMYY`. */
export function parseAboDate(raw: string): Date | null {
  const m = String(raw).trim().match(/^(\d{2})(\d{2})(\d{2})$/);
  if (!m) return null;
  return utc(normYear(+m[3]!), +m[2]!, +m[1]!);
}

function normYear(y: number): number {
  if (y >= 100) return y;
  // Two-digit year: 00–69 → 2000s, 70–99 → 1900s.
  return y <= 69 ? 2000 + y : 1900 + y;
}

function utc(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  // Reject overflow like 31.02.
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d;
}
