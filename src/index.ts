import type { ParseOptions, ParseResult, RawInput, StatementFormat } from './types';
import { decodeBytes } from './utils/encoding';
import { parseCsv } from './csv/parse';
import { looksLikeAbo, parseAbo } from './abo/parse';

export type {
  ParseOptions,
  ParseResult,
  Transaction,
  TransactionDirection,
  StatementFormat,
  StatementMeta,
  RawInput,
} from './types';
export { parseCsv } from './csv/parse';
export { parseAbo } from './abo/parse';
export { parseAmount } from './utils/number';
export { parseDate } from './utils/date';

/**
 * Parse a Czech/Slovak bank statement, auto-detecting encoding and format.
 *
 * @example
 * import { parseStatement } from 'czech-bank-statements';
 * const result = parseStatement(fileBuffer, { incomingOnly: true });
 * for (const tx of result.transactions) {
 *   console.log(tx.date, tx.amount, tx.variableSymbol);
 * }
 */
export function parseStatement(input: RawInput, options: ParseOptions = {}): ParseResult {
  const { text, encoding } = decodeBytes(input, options.encoding ?? 'auto');

  const format: StatementFormat = options.format ?? (looksLikeAbo(text) ? 'abo' : 'csv');

  const result = format === 'abo' ? parseAbo(text) : parseCsv(text, options.delimiter);
  result.encoding = encoding;

  if (options.incomingOnly) {
    const before = result.transactions.length;
    result.transactions = result.transactions.filter((t) => t.amount > 0);
    const removed = before - result.transactions.length;
    if (removed > 0) result.warnings.push(`Odfiltrováno ${removed} odchozích transakcí.`);
  }

  return result;
}
