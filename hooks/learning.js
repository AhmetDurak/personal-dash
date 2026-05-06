import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const FILE = join(dirname(fileURLToPath(import.meta.url)), 'logs', 'learning.json')

export function updateLearning({ tool, success }) {
  let db = {}
  try { db = JSON.parse(readFileSync(FILE, 'utf-8')) } catch {}
  if (!db[tool]) db[tool] = { hits: 0, success: 0, successRate: 0 }
  db[tool].hits += 1
  if (success) db[tool].success += 1
  db[tool].successRate = db[tool].success / db[tool].hits
  writeFileSync(FILE, JSON.stringify(db, null, 2))
}
