import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const LOG_FILE = join(dirname(fileURLToPath(import.meta.url)), 'logs', 'usage.log.json')

export function logToolUsage(entry) {
  let logs = []
  try { logs = JSON.parse(readFileSync(LOG_FILE, 'utf-8')) } catch {}
  logs.push({ ...entry, timestamp: new Date().toISOString() })
  writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2))
}
