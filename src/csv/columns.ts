import { normalizeKey } from '../utils/text';

export interface ColumnMap {
  date?: number;
  amount?: number;
  debit?: number;
  credit?: number;
  currency?: number;
  variableSymbol?: number;
  constantSymbol?: number;
  specificSymbol?: number;
  counterAccount?: number;
  counterBankCode?: number;
  counterName?: number;
  description?: number;
  balance?: number;
  transactionId?: number;
  direction?: number;
}

type Field = keyof ColumnMap;

// Patterns are accent-stripped, lowercased. <=3 chars match exactly; longer
// match as a substring. Ordered most-specific first so generic words
// ("nazev", "datum") don't steal a more specific column.
const FIELD_PATTERNS: [Field, string[]][] = [
  ['variableSymbol', ['variabilni symbol', 'variabilni', 'variable symbol', 'var.symbol', 'vs']],
  ['constantSymbol', ['konstantni symbol', 'konstantni', 'konst.symbol', 'ks']],
  ['specificSymbol', ['specificky symbol', 'specificky', 'spec.symbol', 'ss']],
  ['counterBankCode', ['kod banky', 'smerovy kod', 'bank code']],
  ['counterAccount', ['protiucet', 'cislo protiuctu', 'ucet protistrany', 'cislo uctu', 'counter account', 'iban']],
  ['counterName', ['nazev protiuctu', 'nazev protistrany', 'protistrana', 'prijemce', 'platce', 'nazev uctu', 'nazev', 'name']],
  ['balance', ['zustatek po transakci', 'zustatek', 'balance']],
  ['currency', ['mena', 'currency']],
  ['transactionId', ['id operace', 'id pohybu', 'id transakce', 'cislo pohybu', 'cislo transakce', 'identifikator transakce', 'reference platby', 'reference']],
  ['direction', ['typ pohybu', 'typ transakce', 'smer', 'debet/kredit', 'debet kredit']],
  ['date', ['datum zauctovani', 'datum provedeni', 'datum transakce', 'datum odepsani', 'datum zpracovani', 'datum splatnosti', 'datum', 'date']],
  ['debit', ['vydaj', 'na vrub', 'debet', 'odepsano', 'odchozi']],
  ['credit', ['prijem', 've prospech', 'kredit', 'pripsano', 'prichozi']],
  ['amount', ['castka v mene uctu', 'castka', 'objem', 'amount', 'suma', 'obnos', 'partka']],
  ['description', ['zprava pro prijemce', 'zprava', 'ucel platby', 'popis', 'poznamka', 'identifikace transakce', 'detail', 'message', 'note', 'avizo']],
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matches(cell: string, pattern: string): boolean {
  // Short codes (vs/ks/ss) must match the whole cell exactly.
  if (pattern.length <= 3) return cell === pattern;
  // Longer patterns match as a whole word/phrase, so e.g. "příjem" (income)
  // does NOT match "zpráva pro příjemce" (message for the recipient).
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(pattern)}([^a-z0-9]|$)`).test(cell);
}

/** Map a header row's cells to transaction fields. */
export function detectColumns(headerCells: string[]): ColumnMap {
  const norm = headerCells.map((c) => normalizeKey(c));
  const map: ColumnMap = {};
  const taken = new Set<number>();

  for (const [field, patterns] of FIELD_PATTERNS) {
    let bestIdx = -1;
    for (const pattern of patterns) {
      for (let i = 0; i < norm.length; i++) {
        if (taken.has(i)) continue;
        if (matches(norm[i]!, pattern)) {
          bestIdx = i;
          break;
        }
      }
      if (bestIdx >= 0) break;
    }
    if (bestIdx >= 0) {
      map[field] = bestIdx;
      taken.add(bestIdx);
    }
  }

  return map;
}

/** How many useful fields were recognised (used to find the header row). */
export function columnScore(map: ColumnMap): number {
  return Object.keys(map).length;
}
