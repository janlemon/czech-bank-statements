import { describe, expect, it } from 'vitest';
import { parseStatement } from '../src/index';

/**
 * Fixtures mirror the REAL column layouts of Fio and Raiffeisenbank exports
 * (validated against actual statements), with anonymized personal data.
 * They guard the tricky real-world bits: a metadata header block before the
 * table, stray commas in that block, escaped quotes, and field-internal
 * semicolons inside quoted cells.
 */

const FIO_CSV =
  '"Výpis č. 1/2025 z účtu ""1234567890/2010"""\r\n' +
  '"Majitel účtu: Test, Jan, Ulice 1, Praha, 11000, Česká republika"\r\n' +
  '"Období: 01.10.2025 - 31.10.2025"\r\n' +
  '"Počáteční stav účtu k 01.10.2025: 1000,00 CZK"\r\n' +
  '\r\n' +
  '"ID operace";"Datum";"Objem";"Měna";"Protiúčet";"Název protiúčtu";"Kód banky";"Název banky";"KS";"VS";"SS";"Poznámka";"Zpráva pro příjemce";"Typ";"Provedl";"Upřesnění";"Poznámka";"BIC";"ID pokynu"\r\n' +
  '"111";"15.10.2025";"5000";"CZK";"68536004";"Ezpada s.r.o.";"2700";"UniCredit";"";"20250009";"";"Najem";"VS/0020250009";"Bezhotovostní příjem";"";"";"";"";"222"\r\n' +
  '"333";"20.10.2025";"-3000";"CZK";"1112003411";"";"0710";"ČNB";"0558";"9407153030";"";"VZP";"";"Bezhotovostní platba";"";"";"";"";"444"\r\n';

const RAIFFEISEN_CSV =
  'Datum provedení;Datum zaúčtování;Číslo účtu;Název účtu;Kategorie transakce;Číslo protiúčtu;Název protiúčtu;Typ transakce;Zpráva;Poznámka;VS;KS;SS;Zaúčtovaná částka;Měna účtu;Původní částka;Původní měna;Poplatky;Id transakce;Vlastní poznámka;Název obchodníka;Město\r\n' +
  '"08.06.2026";"08.06.2026 14:23";"7614519001/5500";"Jan Test";"Platba";"1448367016/3030";"Nikola Z.";"Příchozí úhrada";"";"";"";"";"";"20000";"CZK";"";"";"0";"9071506574";"";"";""\r\n' +
  '"03.06.2026";"03.06.2026 06:36";"7614519001/5500";"Jan Test";"Výběr";"516872XXXXXX8556";"";"Výběr hotovosti";"CSOB 4134; Praha 8; CZE";"";"";"1178";"";"-1000";"CZK";"";"";"0";"9065635005";"";"ATM";"Praha"\r\n';

describe('real bank CSV layouts (anonymized)', () => {
  it('Fio: skips the metadata block and picks ; despite commas in it', () => {
    const res = parseStatement(FIO_CSV);
    expect(res.ok).toBe(true);
    expect(res.transactions).toHaveLength(2);

    const [a, b] = res.transactions;
    expect(a!.amount).toBe(5000);
    expect(a!.direction).toBe('credit');
    expect(a!.variableSymbol).toBe('20250009');
    expect(a!.counterpartyAccount).toBe('68536004/2700');
    expect(a!.counterpartyName).toBe('Ezpada s.r.o.');
    expect(a!.transactionId).toBe('111');
    expect(a!.date.toISOString().slice(0, 10)).toBe('2025-10-15');

    expect(b!.amount).toBe(-3000);
    expect(b!.variableSymbol).toBe('9407153030');
    expect(b!.constantSymbol).toBe('558');
  });

  it('Raiffeisen: handles semicolons inside quoted fields + 22 columns', () => {
    const res = parseStatement(RAIFFEISEN_CSV);
    expect(res.ok).toBe(true);
    expect(res.transactions).toHaveLength(2);

    const [a, b] = res.transactions;
    expect(a!.amount).toBe(20000);
    expect(a!.direction).toBe('credit');
    expect(a!.counterpartyAccount).toBe('1448367016/3030');
    expect(a!.counterpartyName).toBe('Nikola Z.');

    // The "Zpráva" field contains "CSOB 4134; Praha 8; CZE" — internal
    // semicolons must NOT shift the columns.
    expect(b!.amount).toBe(-1000);
    expect(b!.direction).toBe('debit');
    expect(b!.constantSymbol).toBe('1178');
  });
});
