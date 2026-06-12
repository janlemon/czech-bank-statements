import { describe, expect, it } from 'vitest';
import { parseCsv } from '../src/csv/parse';
import { parseStatement } from '../src/index';

const SAMPLE = [
  'Datum;Objem;Měna;Variabilní symbol;Konstantní symbol;Protiúčet;Kód banky;Název protiúčtu;Zpráva pro příjemce',
  '01.06.2026;15 000,00;CZK;202506;0308;123456789;0100;Jan Novák;Najem cerven',
  '02.06.2026;-1 250,50;CZK;;;987654321;0800;Plyn s.r.o.;Zaloha plyn',
].join('\n');

describe('CSV parser (auto-detect)', () => {
  it('parses a typical Czech semicolon CSV with comma decimals', () => {
    const res = parseCsv(SAMPLE);
    expect(res.ok).toBe(true);
    expect(res.transactions).toHaveLength(2);

    const [a, b] = res.transactions;
    expect(a!.date.toISOString().slice(0, 10)).toBe('2026-06-01');
    expect(a!.amount).toBe(15000);
    expect(a!.direction).toBe('credit');
    expect(a!.currency).toBe('CZK');
    expect(a!.variableSymbol).toBe('202506');
    expect(a!.counterpartyAccount).toBe('123456789/0100');
    expect(a!.counterpartyName).toBe('Jan Novák');
    expect(a!.description).toBe('Najem cerven');

    expect(b!.amount).toBe(-1250.5);
    expect(b!.direction).toBe('debit');
    expect(b!.counterpartyAccount).toBe('987654321/0800');
  });

  it('handles separate debit/credit (příjem/výdaj) columns', () => {
    const csv = [
      'Datum;Příjem;Výdaj;Variabilní symbol',
      '03.06.2026;5000,00;;111',
      '04.06.2026;;2000,00;222',
    ].join('\n');
    const res = parseCsv(csv);
    expect(res.transactions).toHaveLength(2);
    expect(res.transactions[0]!.amount).toBe(5000);
    expect(res.transactions[1]!.amount).toBe(-2000);
  });

  it('skips summary/footer rows without a valid date+amount', () => {
    const csv = `${SAMPLE}\nSoučet;13 749,50;;;;;;;`;
    const res = parseCsv(csv);
    expect(res.transactions).toHaveLength(2);
    expect(res.warnings.join(' ')).toMatch(/Přeskočeno/);
  });

  it('parseStatement auto-detects CSV and can keep only incoming', () => {
    const res = parseStatement(SAMPLE, { incomingOnly: true });
    expect(res.format).toBe('csv');
    expect(res.transactions).toHaveLength(1);
    expect(res.transactions[0]!.amount).toBe(15000);
  });
});
