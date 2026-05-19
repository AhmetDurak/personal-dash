import 'dotenv/config'
import { pool } from './pool'

type Row = {
  date: string
  name: string
  amount: number
  type: 'income' | 'expense'
  category: string
  source: 'manual'
  month: string
}

function row(date: string, name: string, amount: number, type: 'income' | 'expense', category: string): Row {
  return { date, name, amount, type, category, source: 'manual', month: date.slice(0, 7) }
}

const transactions: Row[] = [
  // 2025-12
  row('2025-12-01', 'Salary', 320000, 'income', 'Income'),
  row('2025-12-02', 'Rent', 95000, 'expense', 'Fixed'),
  row('2025-12-03', 'Rewe', 8700, 'expense', 'Market'),
  row('2025-12-05', 'Spotify', 1099, 'expense', 'Entertainment'),
  row('2025-12-07', 'Lidl', 5400, 'expense', 'Market'),
  row('2025-12-10', 'ETF Purchase', 50000, 'expense', 'Investment'),
  row('2025-12-12', 'Dr. Schmidt', 4000, 'expense', 'Health'),
  row('2025-12-15', 'Netflix', 1799, 'expense', 'Entertainment'),
  row('2025-12-18', 'Aldi', 3200, 'expense', 'Market'),
  row('2025-12-20', 'Udemy Course', 1499, 'expense', 'Education'),
  row('2025-12-22', 'GEZ', 1875, 'expense', 'Fixed'),
  row('2025-12-28', 'Freelance Project', 80000, 'income', 'Income'),

  // 2026-01
  row('2026-01-01', 'Salary', 320000, 'income', 'Income'),
  row('2026-01-02', 'Rent', 95000, 'expense', 'Fixed'),
  row('2026-01-04', 'Rewe', 9200, 'expense', 'Market'),
  row('2026-01-06', 'Public Transport', 4900, 'expense', 'Fixed'),
  row('2026-01-08', 'Gym Membership', 2990, 'expense', 'Health'),
  row('2026-01-10', 'ETF Purchase', 50000, 'expense', 'Investment'),
  row('2026-01-13', 'Amazon', 3450, 'expense', 'Others'),
  row('2026-01-15', 'Netflix', 1799, 'expense', 'Entertainment'),
  row('2026-01-17', 'Pharmacy', 1800, 'expense', 'Health'),
  row('2026-01-20', 'Lidl', 4800, 'expense', 'Market'),
  row('2026-01-24', 'Spotify', 1099, 'expense', 'Entertainment'),
  row('2026-01-28', 'Freelance Project', 65000, 'income', 'Income'),
  row('2026-01-30', 'Internet Bill', 3999, 'expense', 'Fixed'),

  // 2026-02
  row('2026-02-01', 'Salary', 320000, 'income', 'Income'),
  row('2026-02-02', 'Rent', 95000, 'expense', 'Fixed'),
  row('2026-02-05', 'Rewe', 7600, 'expense', 'Market'),
  row('2026-02-07', 'Valentines Dinner', 12000, 'expense', 'Entertainment'),
  row('2026-02-10', 'ETF Purchase', 50000, 'expense', 'Investment'),
  row('2026-02-12', 'Public Transport', 4900, 'expense', 'Fixed'),
  row('2026-02-14', 'Gym Membership', 2990, 'expense', 'Health'),
  row('2026-02-16', 'Aldi', 5100, 'expense', 'Market'),
  row('2026-02-18', 'Spotify', 1099, 'expense', 'Entertainment'),
  row('2026-02-20', 'Book Store', 2800, 'expense', 'Education'),
  row('2026-02-22', 'Netflix', 1799, 'expense', 'Entertainment'),
  row('2026-02-25', 'Dentist', 8000, 'expense', 'Health'),

  // 2026-03
  row('2026-03-01', 'Salary', 320000, 'income', 'Income'),
  row('2026-03-02', 'Rent', 95000, 'expense', 'Fixed'),
  row('2026-03-03', 'Rewe', 8900, 'expense', 'Market'),
  row('2026-03-05', 'Public Transport', 4900, 'expense', 'Fixed'),
  row('2026-03-07', 'Gym Membership', 2990, 'expense', 'Health'),
  row('2026-03-10', 'ETF Purchase', 75000, 'expense', 'Investment'),
  row('2026-03-12', 'Udemy Course', 2999, 'expense', 'Education'),
  row('2026-03-15', 'Netflix', 1799, 'expense', 'Entertainment'),
  row('2026-03-17', 'Lidl', 6200, 'expense', 'Market'),
  row('2026-03-19', 'Spotify', 1099, 'expense', 'Entertainment'),
  row('2026-03-22', 'Amazon', 5600, 'expense', 'Others'),
  row('2026-03-25', 'Freelance Project', 120000, 'income', 'Income'),
  row('2026-03-28', 'Internet Bill', 3999, 'expense', 'Fixed'),
  row('2026-03-30', 'Pharmacy', 2200, 'expense', 'Health'),

  // 2026-04
  row('2026-04-01', 'Salary', 320000, 'income', 'Income'),
  row('2026-04-02', 'Rent', 95000, 'expense', 'Fixed'),
  row('2026-04-04', 'Rewe', 9500, 'expense', 'Market'),
  row('2026-04-06', 'Public Transport', 4900, 'expense', 'Fixed'),
  row('2026-04-08', 'Gym Membership', 2990, 'expense', 'Health'),
  row('2026-04-10', 'ETF Purchase', 50000, 'expense', 'Investment'),
  row('2026-04-12', 'Concert Tickets', 8800, 'expense', 'Entertainment'),
  row('2026-04-14', 'Aldi', 4300, 'expense', 'Market'),
  row('2026-04-16', 'Spotify', 1099, 'expense', 'Entertainment'),
  row('2026-04-18', 'Netflix', 1799, 'expense', 'Entertainment'),
  row('2026-04-20', 'Online Course', 4900, 'expense', 'Education'),
  row('2026-04-22', 'Pharmacy', 950, 'expense', 'Health'),
  row('2026-04-25', 'Freelance Project', 90000, 'income', 'Income'),
  row('2026-04-28', 'Internet Bill', 3999, 'expense', 'Fixed'),
  row('2026-04-30', 'GEZ', 1875, 'expense', 'Fixed'),

  // 2026-05
  row('2026-05-01', 'Salary', 320000, 'income', 'Income'),
  row('2026-05-02', 'Rent', 95000, 'expense', 'Fixed'),
  row('2026-05-03', 'Rewe', 7800, 'expense', 'Market'),
  row('2026-05-05', 'Public Transport', 4900, 'expense', 'Fixed'),
  row('2026-05-06', 'Gym Membership', 2990, 'expense', 'Health'),
  row('2026-05-07', 'ETF Purchase', 50000, 'expense', 'Investment'),
]

async function seed() {
  const client = await pool.connect()
  try {
    await client.query('DELETE FROM transactions')
    for (const t of transactions) {
      await client.query(
        `INSERT INTO transactions (date, name, amount, type, category, source, month)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [t.date, t.name, t.amount, t.type, t.category, t.source, t.month]
      )
    }
    console.log(`Seeded ${transactions.length} transactions across 6 months`)
  } finally {
    client.release()
    await pool.end()
  }
}

seed().catch(err => { console.error(err); process.exit(1) })
