import { Transaction, Category } from '../../types'
import { RawTransaction } from '../bank/types'
import { CODE_MAP, NAME_RULES } from './categoryMap'

export class CategoryAgent {
  classify(tx: RawTransaction): Category {
    const fromCode = CODE_MAP[tx.transactionCode]
    if (fromCode) return fromCode

    for (const [pattern, cat] of NAME_RULES) {
      if (pattern.test(tx.counterPartyName)) return cat
    }

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
