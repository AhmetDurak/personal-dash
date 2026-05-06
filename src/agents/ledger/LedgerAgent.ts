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

  async saveBankTransactions(txs: Transaction[]): Promise<Transaction[]> {
    return Promise.all(txs.map(tx => this.repo.save(tx)))
  }

  async getSummary(month: string): Promise<MonthSummary> {
    const txs = await this.repo.findByMonth(month)
    return computeSummary(month, txs)
  }
}
