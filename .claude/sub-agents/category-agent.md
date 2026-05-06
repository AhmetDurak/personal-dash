# CategoryAgent

## Responsibility
Map Deutsche Bank raw `transactionCode` + `counterPartyName` → app `Category`.
Pure functions only. No I/O.

## Interface
```ts
interface CategoryAgent {
  classify(tx: RawTransaction): Category
  classifyBatch(txs: RawTransaction[]): Transaction[]
}
```

## DB Transaction Code Map
Deutsche Bank uses ISO 20022 codes (`PMNT.RCDT.*`, `PMNT.CCRD.*`, etc.).

```ts
// src/agents/category/categoryMap.ts
// Extend here — never touch classifier logic (Open/Closed)

export const CODE_MAP: Record<string, Category> = {
  'PMNT.RCDT.XBCT': 'Income',   // credit transfer
  'PMNT.RCDT.ESCT': 'Income',   // SEPA credit
  'PMNT.CCRD.POSD': 'Market',   // card purchase
  'PMNT.DBTRF.ESCT': 'Fixed',   // standing order / direct debit
  'SECU.SETT.COLL': 'Investment',// securities settlement
  'PMNT.ICDT.XBCT': 'Others',   // outgoing transfer
}

export const NAME_RULES: Array<[RegExp, Category]> = [
  [/rewe|aldi|edeka|lidl|penny|netto|kaufland/i, 'Market'],
  [/apotheke|kranken|arzt|zahnarzt|physio|hospital/i, 'Health'],
  [/netflix|spotify|kino|prime|disney|theater/i, 'Entertainment'],
  [/udemy|coursera|linkedin learning|book|bücher/i, 'Education'],
  [/allianz|huk|versicherung|aok|tk |barmer/i, 'Fixed'],
  [/miete|warmmiete|nebenkosten|wohnung/i, 'Fixed'],
  [/dws|comdirect|etf|sparplan|depot|trade republic/i, 'Investment'],
  [/gehalt|lohn|salary|payroll/i, 'Income'],
]
```

## Classifier Logic
```ts
// src/agents/category/CategoryAgent.ts
import { CODE_MAP, NAME_RULES } from './categoryMap'

export class CategoryAgent {
  classify(tx: RawTransaction): Category {
    // 1. Explicit code match
    const fromCode = CODE_MAP[tx.transactionCode]
    if (fromCode) return fromCode

    // 2. Name pattern match
    for (const [pattern, cat] of NAME_RULES) {
      if (pattern.test(tx.counterPartyName)) return cat
    }

    // 3. Sign fallback
    return tx.amount > 0 ? 'Income' : 'Others'
  }

  classifyBatch(txs: RawTransaction[]): Transaction[] {
    return txs.map(tx => ({
      id: `${tx.bookingDate}-${tx.paymentReference}`,
      date: tx.bookingDate,
      name: tx.counterPartyName || tx.paymentReference,
      amount: Math.abs(tx.amount),
      type: tx.amount > 0 ? 'income' : 'expense',
      category: this.classify(tx),
      source: 'bank',
      raw: tx.transactionCode,
    }))
  }
}
```

## Adding New Rules
1. Add code to `CODE_MAP` — highest priority, no logic change
2. Add regex to `NAME_RULES` — order matters, first match wins
3. Never modify `classify()` method

## Tests (required)
```ts
// Each new rule needs a test:
expect(agent.classify({ transactionCode: 'PMNT.RCDT.ESCT', counterPartyName: 'Employer GmbH', amount: 4200 }))
  .toBe('Income')
expect(agent.classify({ transactionCode: 'PMNT.CCRD.POSD', counterPartyName: 'REWE', amount: -45 }))
  .toBe('Market')
```
