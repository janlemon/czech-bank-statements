# czech-bank-statements

Parse **Czech & Slovak bank statements** into a single, typed transaction model.
CSV-first (the format people actually export from internet banking), plus the
legacy **ABO / GPC** format used by accounting software.

- 🇨🇿 **Czech-aware**: variable / constant / specific symbols (VS/KS/SS),
  `číslo účtu/kód banky`, comma decimals, space thousands.
- 🔤 **Encoding-aware**: Czech bank CSVs are frequently **Windows-1250**, not
  UTF-8 — detected automatically.
- 🧭 **Auto-detection**: sniffs the delimiter and maps columns from the header
  (Czech **and** English, accent-insensitive), so it works across banks without
  per-bank configuration.
- 📦 Zero runtime dependencies. ESM + CJS + types.

> **Status: v0.x — validate before you trust it with money.**
> Bank CSV layouts differ and change (e.g. KB → KB+ in 2025). Always review the
> parsed result against the original statement. PRs with **anonymized real
> samples** from your bank are very welcome — that's how coverage improves.

## Install

```bash
npm install czech-bank-statements
```

## Usage

```ts
import { parseStatement } from 'czech-bank-statements';

// input can be a string, Buffer, Uint8Array or ArrayBuffer (raw file bytes)
const result = parseStatement(fileBuffer, { incomingOnly: true });

if (!result.ok) console.warn(result.errors, result.warnings);

for (const tx of result.transactions) {
  console.log(tx.date, tx.amount, tx.currency, tx.variableSymbol, tx.counterpartyName);
}
```

### The transaction model

```ts
interface Transaction {
  date: Date;                 // UTC midnight of the booking date
  amount: number;             // signed: + credit (in), − debit (out); major units
  direction: 'credit' | 'debit';
  currency: string;           // "CZK" by default
  variableSymbol?: string;
  constantSymbol?: string;
  specificSymbol?: string;
  counterpartyAccount?: string; // "123456789/0100"
  counterpartyName?: string;
  description?: string;
  transactionId?: string;
  balance?: number;
  raw?: Record<string, string>; // original row/record
}
```

## Supported formats

| Format | Status | Notes |
|---|---|---|
| **CSV** | ✅ | Auto delimiter + column detection, CP1250/UTF-8, debit/credit or signed amount |
| **ABO / GPC** (`.gpc`) | ✅ | Fixed-width `075`/`074` records; field positions per the Fio/ČS/KB spec |
| camt.053 (ISO 20022 XML) | 🔜 | Planned |
| MT940 | 🔜 | Planned |
| PDF | ❌ | Out of scope (needs OCR/LLM) |

## API

- `parseStatement(input, options?)` — auto-detect encoding + format.
- `parseCsv(text, delimiter?)` — force CSV.
- `parseAbo(text)` — force ABO/GPC.
- `parseAmount`, `parseDate` — exported helpers.

`ParseOptions`: `{ encoding?: 'auto'|'utf-8'|'windows-1250'; delimiter?; format?; incomingOnly? }`.

## Contributing

Found a bank whose CSV isn't recognised? Open an issue/PR with a **small,
anonymized** sample (header row + a few lines). Run `npm test` before submitting.

## License

[MIT](./LICENSE) © Jan Lemon
