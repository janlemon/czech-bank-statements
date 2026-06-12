import { describe, expect, it } from 'vitest';
import { parseAmount } from '../src/utils/number';
import { parseDate } from '../src/utils/date';
import { decodeBytes } from '../src/utils/encoding';

describe('parseAmount', () => {
  it('handles Czech and international styles', () => {
    expect(parseAmount('15 000,00')).toBe(15000);
    expect(parseAmount('-1 250,50')).toBe(-1250.5);
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('1,234.56')).toBe(1234.56);
    expect(parseAmount('1234')).toBe(1234);
    expect(parseAmount('500,00 Kč')).toBe(500);
    expect(parseAmount('(1 000,00)')).toBe(-1000);
  });
  it('returns null for non-numbers', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount(null)).toBeNull();
  });
});

describe('parseDate', () => {
  it('parses Czech and ISO formats', () => {
    expect(parseDate('01.06.2026')!.toISOString().slice(0, 10)).toBe('2026-06-01');
    expect(parseDate('1.6.2026')!.toISOString().slice(0, 10)).toBe('2026-06-01');
    expect(parseDate('2026-06-01')!.toISOString().slice(0, 10)).toBe('2026-06-01');
  });
  it('rejects impossible dates', () => {
    expect(parseDate('31.02.2026')).toBeNull();
    expect(parseDate('')).toBeNull();
  });
});

describe('decodeBytes', () => {
  it('decodes valid UTF-8 as utf-8', () => {
    const bytes = new TextEncoder().encode('Příjem č');
    const { text, encoding } = decodeBytes(bytes);
    expect(text).toBe('Příjem č');
    expect(encoding).toBe('utf-8');
  });
  it('falls back to windows-1250 for non-UTF-8 bytes', () => {
    // 0xC8 = 'Č' in Windows-1250, but an invalid standalone UTF-8 byte.
    const { text, encoding } = decodeBytes(new Uint8Array([0xc8]));
    expect(encoding).toBe('windows-1250');
    expect(text).toBe('Č');
  });
});
