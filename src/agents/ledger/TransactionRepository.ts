import { Transaction } from '../../types'

export interface TransactionRepository {
  findByMonth(month: string): Promise<Transaction[]>
  save(tx: Transaction): Promise<Transaction>
  update(id: string, patch: Partial<Transaction>): Promise<Transaction>
  delete(id: string): Promise<void>
}
