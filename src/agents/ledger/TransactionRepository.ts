import { Transaction } from '../../types'

export interface TransactionRepository {
  findByMonth(month: string): Promise<Transaction[]>
  findAll(): Promise<Transaction[]>
  save(tx: Transaction): Promise<Transaction>
  update(id: string, patch: Partial<Transaction>): Promise<Transaction>
  delete(id: string): Promise<void>
  aggregateNetUpToMonth(month: string): Promise<number>
  aggregateCategoryInRange(category: string, fromMonth: string, toMonth: string): Promise<number>
  recategorizeByName(name: string, category: string): Promise<number>
  findDuplicate(date: string, name: string, amount: number): Promise<Transaction | null>
  getTopPayees(month: string, limit: number): Promise<{ name: string; total: number }[]>
}
