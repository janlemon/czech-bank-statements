import type { ParseResult, StatementMeta, Transaction } from '../types';
import { parseAmount } from '../utils/number';
import { parseDate } from '../utils/date';
import { cleanText, digitsOnly, normalizeKey } from '../utils/text';
import { columnScore, detectColumns, type ColumnMap } from './columns';

/** Split CSV text into rows of cells, honoring quotes and a given delimiter. */
export function tokenizeCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch === '\r') {
      // handled by \n; ignore
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const CSV_DELIMITERS = [';', ',', '\t', '|'];

/**
 * Parse CSV, trying each likely delimiter and keeping the one that actually
 * yields a recognisable table (header with date + amount, most transactions).
 * Robust against metadata header blocks — e.g. Fio prepends account/period/
 * balance lines whose stray commas would fool a naive frequency sniff.
 */
export function parseCsv(text: string, delimiterOverride?: string): ParseResult {
  if (delimiterOverride) return parseCsvWith(text, delimiterOverride);

  let best: ParseResult | null = null;
  let fallback: ParseResult | null = null;
  for (const delimiter of CSV_DELIMITERS) {
    const r = parseCsvWith(text, delimiter);
    fallback ??= r;
    if (r.ok && (best === null || r.transactions.length > best.transactions.length)) {
      best = r;
    }
  }
  return best ?? fallback!;
}

function parseCsvWith(text: string, delimiter: string): ParseResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const meta: StatementMeta = {};
  const rows = tokenizeCsv(text, delimiter).filter((r) => r.some((c) => c.trim() !== ''));

  if (rows.length === 0) {
    return { ok: false, format: 'csv', transactions: [], meta, warnings, errors: ['Soubor je prázdný.'] };
  }

  // Find the header row: the first row that maps to >=2 fields incl. date or an amount.
  let headerIdx = -1;
  let columns: ColumnMap = {};
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const map = detectColumns(rows[i]!);
    const hasAmount = map.amount != null || map.debit != null || map.credit != null;
    if (columnScore(map) >= 2 && map.date != null && hasAmount) {
      headerIdx = i;
      columns = map;
      break;
    }
  }

  if (headerIdx === -1) {
    return {
      ok: false,
      format: 'csv',
      transactions: [],
      meta,
      warnings,
      errors: [
        'Nepodařilo se rozpoznat hlavičku s sloupci (datum + částka). ' +
          'Zkontrolujte oddělovač nebo doplňte profil banky.',
      ],
    };
  }

  const header = rows[headerIdx]!;
  const transactions: Transaction[] = [];
  let skipped = 0;

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const cells = rows[r]!;
    // Skip rows shorter than the header (summary/footer lines).
    if (cells.length < header.length - 1) {
      skipped++;
      continue;
    }

    const date = parseDate(at(cells, columns.date));
    const amount = resolveAmount(cells, columns);

    if (!date || amount == null) {
      skipped++;
      continue;
    }

    const counterAcc = cleanText(at(cells, columns.counterAccount));
    const bankCode = cleanText(at(cells, columns.counterBankCode));
    const counterpartyAccount = counterAcc
      ? bankCode && !counterAcc.includes('/')
        ? `${counterAcc}/${bankCode}`
        : counterAcc
      : undefined;

    transactions.push({
      date,
      amount,
      direction: amount >= 0 ? 'credit' : 'debit',
      currency: cleanText(at(cells, columns.currency)) ?? 'CZK',
      variableSymbol: digitsOnly(at(cells, columns.variableSymbol)),
      constantSymbol: digitsOnly(at(cells, columns.constantSymbol)),
      specificSymbol: digitsOnly(at(cells, columns.specificSymbol)),
      counterpartyAccount,
      counterpartyName: cleanText(at(cells, columns.counterName)),
      description: cleanText(at(cells, columns.description)),
      transactionId: cleanText(at(cells, columns.transactionId)),
      balance: parseAmount(at(cells, columns.balance)) ?? undefined,
      raw: rowToObject(header, cells),
    });
  }

  if (skipped > 0) {
    warnings.push(`Přeskočeno ${skipped} řádků bez platného data/částky (souhrny, prázdné).`);
  }
  if (transactions.length === 0) {
    errors.push('Nenalezeny žádné transakce s platným datem a částkou.');
  }

  return {
    ok: errors.length === 0,
    format: 'csv',
    transactions,
    meta,
    warnings,
    errors,
  };
}

function at(cells: string[], idx: number | undefined): string | undefined {
  return idx == null ? undefined : cells[idx];
}

/** Resolve a signed amount from either a single amount column or debit/credit pair. */
function resolveAmount(cells: string[], columns: ColumnMap): number | null {
  if (columns.amount != null) {
    let amt = parseAmount(at(cells, columns.amount));
    if (amt == null) return null;
    // If the amount is positive but a direction column marks it outgoing, flip it.
    if (amt > 0 && columns.direction != null) {
      const dir = normalizeKey(at(cells, columns.direction) ?? '');
      if (/(vydaj|odchoz|debet|na vrub|odepsan|-)/.test(dir)) amt = -amt;
    }
    return amt;
  }
  if (columns.debit != null || columns.credit != null) {
    const credit = Math.abs(parseAmount(at(cells, columns.credit)) ?? 0);
    const debit = Math.abs(parseAmount(at(cells, columns.debit)) ?? 0);
    if (credit === 0 && debit === 0) return null;
    return credit - debit;
  }
  return null;
}

function rowToObject(header: string[], cells: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  for (let i = 0; i < header.length; i++) {
    const key = (header[i] ?? `col${i}`).trim() || `col${i}`;
    obj[key] = cells[i] ?? '';
  }
  return obj;
}
