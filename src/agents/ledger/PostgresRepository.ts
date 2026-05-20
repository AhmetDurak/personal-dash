import { Pool } from 'pg'
import { Transaction } from '../../types'
import { TransactionRepository } from './TransactionRepository'

export class PostgresRepository implements TransactionRepository {
  constructor(private pool: Pool, private userId: number) {}

  async findByMonth(month: string): Promise<Transaction[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM transactions WHERE month = $1 AND user_id = $2 ORDER BY date DESC',
      [month, this.userId]
    )
    return rows.map(this.toTransaction)
  }

  async save(tx: Transaction): Promise<Transaction> {
    const { rows } = await this.pool.query(
      `INSERT INTO transactions (id, date, name, amount, type, category, source, raw, month, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [tx.id, tx.date, tx.name, tx.amount, tx.type, tx.category, tx.source, tx.raw ?? null, tx.date.slice(0, 7), this.userId]
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
      `UPDATE transactions SET ${sets} WHERE id = $1 AND user_id = $${keys.length + 2} RETURNING *`,
      [id, ...values, this.userId]
    )
    if (!rows[0]) throw new Error(`Transaction ${id} not found`)
    return this.toTransaction(rows[0])
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [id, this.userId])
  }

  async aggregateNetUpToMonth(month: string): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS net
       FROM transactions WHERE month <= $1 AND user_id = $2`,
      [month, this.userId]
    )
    return Number(rows[0].net)
  }

  async aggregateCategoryInRange(category: string, fromMonth: string, toMonth: string): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
       WHERE category = $1 AND month >= $2 AND month <= $3 AND user_id = $4`,
      [category, fromMonth, toMonth, this.userId]
    )
    return Number(rows[0].total)
  }

  async findDuplicate(date: string, name: string, amount: number): Promise<Transaction | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM transactions WHERE date = $1 AND LOWER(name) = LOWER($2) AND amount = $3 AND user_id = $4 LIMIT 1`,
      [date, name, amount, this.userId]
    )
    return rows[0] ? this.toTransaction(rows[0]) : null
  }

  async recategorizeByName(name: string, category: string): Promise<number> {
    const { rowCount } = await this.pool.query(
      `UPDATE transactions SET category = $1 WHERE LOWER(name) = LOWER($2) AND category != $1 AND user_id = $3`,
      [category, name, this.userId]
    )
    return rowCount ?? 0
  }

  async getTopPayees(month: string, limit: number): Promise<{ name: string; total: number }[]> {
    const { rows } = await this.pool.query(
      `SELECT name, SUM(amount) AS total FROM transactions
       WHERE month = $1 AND type = 'expense' AND user_id = $3
       GROUP BY name ORDER BY total DESC LIMIT $2`,
      [month, limit, this.userId]
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
