/**
 * Parse a money amount written in any common Czech/European/US style:
 *   "1 234,56", "1.234,56", "1,234.56", "-1234.56", "1 234,56 Kč", "(1 234,56)"
 * Returns a Number (major units) or null if unparseable.
 */
export function parseAmount(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;

  let s = String(raw).trim();
  if (!s) return null;

  // Strip currency labels/symbols and all kinds of spaces (incl. NBSP / narrow NBSP).
  s = s.replace(/(kč|czk|eur|€|usd|\$|huf|pln)/gi, '').replace(/[\s  ]/g, '');

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('-')) {
    negative = true;
    s = s.slice(1);
  }
  // A trailing minus ("1234-") is used by some accounting exports.
  if (s.endsWith('-')) {
    negative = true;
    s = s.slice(0, -1);
  }

  s = normalizeDecimal(s);
  if (s === '' || !/^\d*\.?\d*$/.test(s) || s === '.') return null;

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

/**
 * Collapse mixed thousands/decimal separators to a plain `123.45` string.
 * The separator that appears LAST is treated as the decimal point; the other
 * is removed as a thousands separator.
 */
function normalizeDecimal(s: string): string {
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma === -1 && lastDot === -1) return s;

  const decimalSep = lastComma > lastDot ? ',' : '.';
  const thousandsSep = decimalSep === ',' ? '.' : ',';

  return s.split(thousandsSep).join('').replace(decimalSep, '.');
}

/** Convert haléře (integer, amount × 100) to CZK, used by the ABO format. */
export function hellersToAmount(haleru: string | number): number | null {
  const n = typeof haleru === 'number' ? haleru : Number(String(haleru).trim());
  if (!Number.isFinite(n)) return null;
  return n / 100;
}
