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
    const effective: Record<string, unknown> = { ...patch }
    if (patch.date) effective['month'] = patch.date.slice(0, 7)
    const keys = Object.keys(effective)
    const sets = keys.map((f, i) => `${f} = $${i + 2}`).join(', ')
    const values = keys.map(k => effective[k])
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

  async aggregateNetUpToMonth(month: string): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS net
       FROM transactions WHERE month <= $1`,
      [month]
    )
    return Number(rows[0].net)
  }

  async aggregateCategoryInRange(category: string, fromMonth: string, toMonth: string): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
       WHERE category = $1 AND month >= $2 AND month <= $3`,
      [category, fromMonth, toMonth]
    )
    return Number(rows[0].total)
  }

  async findDuplicate(date: string, name: string, amount: number): Promise<Transaction | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM transactions WHERE date = $1 AND LOWER(name) = LOWER($2) AND amount = $3 LIMIT 1`,
      [date, name, amount]
    )
    return rows[0] ? this.toTransaction(rows[0]) : null
  }

  async recategorizeByName(name: string, category: string): Promise<number> {
    const { rowCount } = await this.pool.query(
      `UPDATE transactions SET category = $1 WHERE LOWER(name) = LOWER($2) AND category != $1`,
      [category, name]
    )
    return rowCount ?? 0
  }

  async getTopPayees(month: string, limit: number): Promise<{ name: string; total: number }[]> {
    const { rows } = await this.pool.query(
      `SELECT name, SUM(amount) AS total FROM transactions
       WHERE month = $1 AND type = 'expense'
       GROUP BY name ORDER BY total DESC LIMIT $2`,
      [month, limit]
    )
    return rows.map(r => ({ name: r.name as string, total: Number(r.total) }))
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
