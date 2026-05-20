import { readFileSync } from 'fs'
import path from 'path'
import { pool } from './pool'

export async function migrate() {
  const sql = readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8')
  await pool.query(sql)
  console.log('DB migration complete')
}
