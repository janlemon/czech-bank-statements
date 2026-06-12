import { describe, expect, it } from 'vitest';
import { parseAbo } from '../src/abo/parse';

/**
 * Build a fixed-width ABO "075" entry record at the documented field positions
 * (jakubzapletal/bank-statements + Fio/ČS/KB format docs). Expected semantics
 * cross-checked against that reference implementation's test values.
 */
function aboEntry(opts: {
  account?: string;
  counter?: string;
  bankCode?: string;
  receipt?: string;
  haleru: number;
  code: '1' | '2' | '4' | '5';
  vs?: string;
  ks?: string;
  ss?: string;
  note?: string;
  date: string; // DDMMYY
}): string {
  const a = Array<string>(128).fill(' ');
  const set = (start: number, s: string) => {
    for (let i = 0; i < s.length; i++) a[start + i] = s[i]!;
  };
  set(0, '075');
  set(3, (opts.account ?? '12345').padStart(16, '0'));
  set(19, (opts.counter ?? '156789').padStart(16, '0'));
  set(35, (opts.receipt ?? '2001').padStart(13, '0'));
  set(48, String(opts.haleru).padStart(12, '0'));
  set(60, opts.code);
  set(61, (opts.vs ?? '').padStart(10, '0'));
  set(73, (opts.bankCode ?? '1000').padEnd(4, '0'));
  set(77, (opts.ks ?? '').padStart(4, '0'));
  set(81, (opts.ss ?? '').padStart(10, '0'));
  set(97, (opts.note ?? '').padEnd(20, ' '));
  set(122, opts.date);
  return a.join('');
}

describe('ABO/GPC parser', () => {
  it('parses a credit and a debit entry with all Czech symbols', () => {
    const text = [
      aboEntry({ haleru: 40000, code: '2', vs: '11', ks: '12', ss: '13', note: 'Tran 1', date: '050114' }),
      aboEntry({
        counter: '256789',
        haleru: 60000,
        code: '1',
        vs: '22',
        ss: '23',
        note: 'Tran 2',
        date: '070114',
      }),
    ].join('\n');

    const res = parseAbo(text);
    expect(res.ok).toBe(true);
    expect(res.transactions).toHaveLength(2);

    const [a, b] = res.transactions;
    // Credit: +400.00
    expect(a!.amount).toBe(400);
    expect(a!.direction).toBe('credit');
    expect(a!.variableSymbol).toBe('11');
    expect(a!.constantSymbol).toBe('12');
    expect(a!.specificSymbol).toBe('13');
    expect(a!.counterpartyAccount).toBe('156789/1000');
    expect(a!.description).toBe('Tran 1');
    expect(a!.date.toISOString().slice(0, 10)).toBe('2014-01-05');

    // Debit: −600.00
    expect(b!.amount).toBe(-600);
    expect(b!.direction).toBe('debit');
    expect(b!.variableSymbol).toBe('22');
    expect(b!.specificSymbol).toBe('23');
    expect(b!.date.toISOString().slice(0, 10)).toBe('2014-01-07');
  });

  it('treats storno debit (code 4) as money back in', () => {
    const res = parseAbo(aboEntry({ haleru: 10000, code: '4', date: '010124' }));
    expect(res.transactions[0]!.amount).toBe(100);
    expect(res.transactions[0]!.direction).toBe('credit');
  });

  it('reports no transactions when there are no 075 records', () => {
    const res = parseAbo('something that is not ABO');
    expect(res.ok).toBe(false);
    expect(res.transactions).toHaveLength(0);
  });
});
