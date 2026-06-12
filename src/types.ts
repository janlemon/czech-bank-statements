export type StatementFormat = 'csv' | 'abo' | 'unknown';

export type TransactionDirection = 'credit' | 'debit';

/** A single normalized transaction from a bank statement. */
export interface Transaction {
  /** Booking (or value) date, as UTC midnight of the local calendar date. */
  date: Date;
  /**
   * Signed amount: positive = credit (money in), negative = debit (money out).
   * Always in major units (CZK, not haléře).
   */
  amount: number;
  direction: TransactionDirection;
  /** ISO 4217 code, e.g. "CZK". Best-effort; falls back to "CZK". */
  currency: string;

  /** Czech payment symbols (digits only). */
  variableSymbol?: string;
  constantSymbol?: string;
  specificSymbol?: string;

  /** Counterparty account, e.g. "123456789/0100" (with bank code when known). */
  counterpartyAccount?: string;
  counterpartyName?: string;

  /** Free-text description / message for recipient. */
  description?: string;
  /** Bank's own transaction id when present (used for dedup). */
  transactionId?: string;
  /** Account balance after this entry, if the statement provides it. */
  balance?: number;

  /** The original parsed row/record, for debugging. */
  raw?: Record<string, string>;
}

export interface StatementMeta {
  accountNumber?: string;
  iban?: string;
  currency?: string;
  openingBalance?: number;
  closingBalance?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ParseResult {
  ok: boolean;
  format: StatementFormat;
  /** Detected bank identifier when recognised (e.g. "kb", "fio"). */
  bank?: string;
  /** Encoding the bytes were decoded with. */
  encoding?: string;
  transactions: Transaction[];
  meta: StatementMeta;
  warnings: string[];
  errors: string[];
}

export interface ParseOptions {
  /**
   * Text encoding of the input. Default 'auto':
   * UTF-8 BOM → utf-8; valid UTF-8 → utf-8; otherwise windows-1250
   * (the usual default for Czech bank CSV exports).
   */
  encoding?: 'auto' | 'utf-8' | 'windows-1250';
  /** Force the CSV field delimiter. Default: auto-sniff (`;`, `,` or tab). */
  delimiter?: string;
  /** Force the format instead of auto-detecting. */
  format?: StatementFormat;
  /** Keep only incoming (credit) transactions. Default false. */
  incomingOnly?: boolean;
}

export type RawInput = string | Uint8Array | ArrayBuffer | Buffer;
