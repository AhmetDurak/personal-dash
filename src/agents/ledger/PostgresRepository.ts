import { Pool } from 'pg'
import { Transaction } from '../../types'
import { TransactionRepository } from './TransactionRepository'

export class PostgresRepository implements TransactionRepository {
  constructor(private pool: Pool) {}

  async findByMonth(month: string): Promise<Transaction[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM transactions WHERE month = $1 ORDER BY date DESC',
      [month]
    )
    return rows.map(this.toTransaction)
  }

  async save(tx: Transaction): Promise<Transaction> {
    const { rows } = await this.pool.query(
      `INSERT INTO transactions (id, date, name, amount, type, category, source, raw, month)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [tx.id, tx.date, tx.name, tx.amount, tx.type, tx.category, tx.source, tx.raw ?? null, tx.date.slice(0, 7)]
    )
    return this.toTransaction(rows[0])
  }

  async update(id: string, patch: Partial<Transaction>): Promise<Transaction> {
    const fields = Object.keys(patch) as (keyof Transaction)[]
    const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ')
    const values = fields.map(f => patch[f])
    const { rows } = await this.pool.query(
      `UPDATE transactions SET ${sets} WHERE id = $1 RETURNING *`,
      [id, ...values]
    )
    if (!rows[0]) throw new Error(`Transaction ${id} not found`)
    return this.toTransaction(rows[0])
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM transactions WHERE id = $1', [id])
  }

  private toTransaction(row: Record<string, unknown>): Transaction {
    return {
      id: row.id as string,
      date: (row.date as Date).toISOString().slice(0, 10),
      name: row.name as string,
      amount: row.amount as number,
      type: row.type as Transaction['type'],
      category: row.category as Transaction['category'],
      source: row.source as Transaction['source'],
      raw: row.raw as string | undefined,
    }
  }
}
