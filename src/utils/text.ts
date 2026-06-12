/** Lowercase + strip diacritics, for accent-insensitive header matching. */
export function normalizeKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

/**
 * Keep digits only and drop leading zeros — for VS/KS/SS, which are numeric
 * identifiers that statements often zero-pad. "0000000011" → "11".
 * Returns undefined if nothing meaningful is left.
 */
export function digitsOnly(s: string | null | undefined): string | undefined {
  if (s == null) return undefined;
  const d = String(s).replace(/\D/g, '').replace(/^0+/, '');
  return d.length ? d : undefined;
}

/** Trim and collapse whitespace; undefined if empty. */
export function cleanText(s: string | null | undefined): string | undefined {
  if (s == null) return undefined;
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length ? t : undefined;
}
