import type { RawInput } from '../types';

function toBytes(input: RawInput): Uint8Array {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  // Buffer is a Uint8Array subclass, handled above.
  // string handled by caller.
  return new Uint8Array(0);
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Decode raw input to text. Czech bank CSV exports are very often
 * Windows-1250, not UTF-8, so we detect rather than assume.
 *
 * 'auto': UTF-8 BOM → utf-8; bytes that are valid UTF-8 → utf-8; otherwise
 * windows-1250 (single-byte, always decodes — the right fallback for CZ banks).
 */
export function decodeBytes(
  input: RawInput,
  encoding: 'auto' | 'utf-8' | 'windows-1250' = 'auto',
): { text: string; encoding: string } {
  if (typeof input === 'string') {
    return { text: stripBom(input), encoding: 'utf-8' };
  }

  const bytes = toBytes(input);

  if (encoding === 'utf-8' || encoding === 'windows-1250') {
    return { text: stripBom(new TextDecoder(encoding).decode(bytes)), encoding };
  }

  // UTF-8 BOM
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { text: new TextDecoder('utf-8').decode(bytes.subarray(3)), encoding: 'utf-8' };
  }

  // Strict UTF-8: throws on invalid sequences → then it's almost certainly CP1250.
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { text: stripBom(text), encoding: 'utf-8' };
  } catch {
    return { text: stripBom(new TextDecoder('windows-1250').decode(bytes)), encoding: 'windows-1250' };
  }
}
