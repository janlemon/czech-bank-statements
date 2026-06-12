# ČNB ABO-K statement formats (FV5 / FV4 / FV3) — reference

Source: **ČNB**, "Příloha č. 2 k Podmínkám České národní banky pro používání
služby ABO-K internetové bankovnictví — Jména a formáty datových souborů"
(platné od 1. května 2023).

> ⚠️ These ABO-K formats are **delimiter-separated record formats**, distinct
> from the classic fixed-width **GPC** (`074`/`075` records) that Fio, KB, J&T,
> etc. export and that `src/abo/` already parses. ABO-K is ČNB's own home-banking
> service (mostly state/institutional clients). Documented here so the FV parsers
> can be added later. **Not yet implemented.**

## Common properties (§2)
- Encoding: **ASCII / code page 1250**.
- A record is a sequence of fields ended by `CR`+`LF`.
- Field separator: **`;`** for FV5, **`~`** for FV4 and FV3.
- First field of every record is a 3-char **record type**.
- Field types:
  - `N` numeric (digits, leading zeros allowed)
  - `Z` money in the **minor unit (haléře)**; minus at the first position for
    negatives, **no sign for positives** (used by FV4/FV3)
  - `C` money in the **major unit (CZK)**; minus for negatives; up to 2 decimals
    (comma, or dot in FV5) (used by FV5)
  - `A` alphanumeric · `D` date `DDMMRR` (6) · `U` account `PPPPPP-ZZZZZZZZZZ`
    (with dash) · `V` account as ≤16 digits (no dash) · `T`/`M` text
- A `T` value containing `;` or `"` is wrapped in `"`; an embedded `"` is doubled.

## Records
File: header (`FV5`/`FV4`/`FV3`) → one or more statements → `KON` (file footer).
Statement: `HVY` (header) → one or more `PVY` (items) → `KVY` (footer).
`TXT` note records may appear anywhere and are ignored.

## PVY (statement item) field order

### FV5 (`;`-separated, amount type C = CZK)
`PVY` ; ČísloPoložky(N) ; InterníId(A13) ; ExterníId(T) ; DruhPoložky(T) ;
TypÚčtuProtistrany(A1: D/I/Z/N) ; ÚčetProtistrany(V/A) ; BankaProtistrany(T) ;
NázevProtistrany(T) ; AdresaProtistrany(T) ; Operace(T2) ; **Částka(C)** ;
VS(N≤10) ; KS(N≤10) ; SS(N≤10) ; DatumÚčtování(D) ; DatumValuty(D) ;
DatumOdepsání(D) ; ZpůsobZpoplatnění(A) ; ZprávaPříjemci(T≤140) ; Informace(T≤140)

### FV4 (`~`-separated, amount type Z = haléře)
`PVY` ~ ČísloPoložky(N) ~ InterníId(A13) ~ ExterníId(T) ~ ÚčetProtistrany(U) ~
KódBankyProtistrany(N4) ~ Popis/NázevÚčtuProtistrany(T≤20) ~ Operace(T2) ~
**Částka(Z)** ~ VS(N) ~ KS(N) ~ SS(N) ~ SymbolDevStat(N, nepoužívá se) ~
DatumÚčtování(D) ~ DatumValuty(D) ~ DatumOdepsání(D) ~ ZprávaPříjemci(T) ~ Informace(T)

### FV3 (`~`-separated, amount type Z = haléře)
`PVY` ~ ČísloDokladu(N≤13) ~ ÚčetProtistrany(U) ~ KódBanky(N4) ~
Popis/NázevÚčtuProtistrany(T≤38) ~ Operace(T2) ~ **Částka(Z)** ~ VS(N) ~ KS(N) ~
SS(N) ~ DatumValuty(D) ~ DatumOdepsání(D) ~ ZprávaPříjemci(T) ~ Informace(T)

## Operace (operation) codes
`UH` úhrada (payment) · `IN` inkaso (direct debit) · `SU` storno úhrady ·
`SI` storno inkasa · `BI` bilanční převod.

The **sign of the amount** gives the transaction direction (positive = credit /
money in, negative = debit / money out); the operace only classifies the kind.
