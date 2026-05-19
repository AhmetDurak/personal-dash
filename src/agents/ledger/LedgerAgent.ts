import { v4 as uuidv4 } from 'uuid'
import { Transaction, MonthSummary } from '../../types'
import { TransactionRepository } from './TransactionRepository'
import { computeSummary } from './compute'

export class LedgerAgent {
  constructor(private repo: TransactionRepository) {}

  async addEntry(entry: Omit<Transaction, 'id' | 'source'>): Promise<Transaction> {
    const tx: Transaction = { ...entry, id: uuidv4(), source: 'manual' }
    return this.repo.save(tx)
  }

  async updateEntry(id: string, patch: Partial<Transaction>): Promise<Transaction> {
    return this.repo.update(id, patch)
  }

  async deleteEntry(id: string): Promise<void> {
    return this.repo.delete(id)
  }

  async getTransactions(month: string): Promise<Transaction[]> {
    return this.repo.findByMonth(month)
  }

  async findDuplicate(date: string, name: string, amount: number): Promise<Transaction | null> {
    return this.repo.findDuplicate(date, name, amount)
  }

  async recategorizeByName(name: string, category: string): Promise<number> {
    return this.repo.recategorizeByName(name, category)
  }

  async saveBankTransactions(txs: Transaction[]): Promise<Transaction[]> {
    return Promise.all(txs.map(tx => this.repo.save(tx)))
  }

  async topPayees(month: string, limit = 10): Promise<{ name: string; total: number }[]> {
    return this.repo.getTopPayees(month, limit)
  }

  async getSummary(month: string): Promise<MonthSummary> {
    const [txs, endBalance, investmentsYTD] = await Promise.all([
      this.repo.findByMonth(month),
      this.repo.aggregateNetUpToMonth(month),
      this.repo.aggregateCategoryInRange('Investment', `${month.slice(0, 4)}-01`, month),
    ])
    const summary = computeSummary(month, txs)
    return { ...summary, endBalance, investmentsYTD }
  }
}
