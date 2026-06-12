import type { ParseResult, StatementMeta, Transaction } from '../types';
import { parseAboDate } from '../utils/date';
import { cleanText, digitsOnly } from '../utils/text';

/**
 * Parse the Czech/Slovak ABO (a.k.a. GPC, `.gpc`) bank statement format.
 *
 * Fixed-width records; field positions taken from the long-standing reference
 * implementation jakubzapletal/bank-statements (and the Fio/ČS/KB format docs):
 *
 *   "074" header:  account(3,16) lastBalance(45,14)+sign(59) balance(60,14)+sign(74) date(108,6 DDMMYY)
 *   "075" entry:   account(3,16) counterAccount(19,16) receiptId(35,13) amount-haléře(48,12)
 *                  postingCode(60,1) variableSymbol(61,10) bankCode(73,4) constantSymbol(77,4)
 *                  specificSymbol(81,10) note(97,20) date(122,6 DDMMYY)
 *   postingCode:   1=debit, 2=credit, 4=storno debit, 5=storno credit
 */
export function parseAbo(text: string): ParseResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const transactions: Transaction[] = [];
  const meta: StatementMeta = { currency: 'CZK' };

  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    if (line.trim().length === 0) continue;
    const type = line.slice(0, 3);

    if (type === '074') {
      const account = stripZeros(field(line, 3, 16));
      if (account) meta.accountNumber = account;

      const ob = haleru(field(line, 45, 14));
      if (ob != null) meta.openingBalance = line.slice(59, 60) === '-' ? -ob : ob;

      const cb = haleru(field(line, 60, 14));
      if (cb != null) meta.closingBalance = line.slice(74, 75) === '-' ? -cb : cb;

      const d = parseAboDate(field(line, 108, 6)) ?? parseAboDate(field(line, 39, 6));
      if (d) meta.dateTo = d;
      continue;
    }

    if (type === '075') {
      const abs = haleru(field(line, 48, 12)) ?? 0;
      const code = line.slice(60, 61);
      // Signed: credit (+) for incoming / debit reversal, debit (−) for outgoing.
      let amount: number;
      switch (code) {
        case '2': // credit (připsání)
        case '4': // storno debit → money back in
          amount = abs;
          break;
        case '1': // debit (odepsání)
        case '5': // storno credit → money back out
          amount = -abs;
          break;
        default:
          amount = abs;
          warnings.push(`Neznámý kód účtování "${code}" — částka brána kladně.`);
      }

      const counter = stripZeros(field(line, 19, 16));
      const bankCode = field(line, 73, 4).trim();
      const date = parseAboDate(field(line, 122, 6));
      if (!date) warnings.push('Záznam 075 bez platného data.');

      transactions.push({
        date: date ?? new Date(NaN),
        amount,
        direction: amount >= 0 ? 'credit' : 'debit',
        currency: 'CZK',
        variableSymbol: digitsOnly(field(line, 61, 10)),
        constantSymbol: digitsOnly(field(line, 77, 4)),
        specificSymbol: digitsOnly(field(line, 81, 10)),
        counterpartyAccount: counter ? (bankCode ? `${counter}/${bankCode}` : counter) : undefined,
        description: cleanText(field(line, 97, 20)),
        transactionId: stripZeros(field(line, 35, 13)) || undefined,
        raw: { line },
      });
    }
    // "076"/"078"/"079" are additional message/info records; ignored in v0.1.
  }

  if (transactions.length === 0) {
    errors.push('Nenalezeny žádné transakce (chybí záznamy typu 075).');
  }

  return {
    ok: errors.length === 0,
    format: 'abo',
    encoding: undefined,
    transactions,
    meta,
    warnings,
    errors,
  };
}

function field(line: string, start: number, len: number): string {
  return line.slice(start, start + len);
}

function stripZeros(s: string): string {
  return s.replace(/^0+/, '').trim();
}

function haleru(s: string): number | null {
  const cleaned = s.replace(/^0+/, '').trim();
  if (cleaned === '') return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n / 100 : null;
}

/** Heuristic: does this text look like an ABO/GPC file? */
export function looksLikeAbo(text: string): boolean {
  // First non-empty line starts with a 074/075 record marker.
  for (const line of text.split(/\r?\n/)) {
    if (line.trim().length === 0) continue;
    return /^07[4-9]/.test(line);
  }
  return false;
}
