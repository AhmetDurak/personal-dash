import fs from "fs"

const FILE = "./mcp-proxy/logs/learning.json"

export function updateLearning({ tool, success }) {
  let db = {}

  try {
    db = JSON.parse(fs.readFileSync(FILE, "utf-8"))
  } catch {}

  if (!db[tool]) {
    db[tool] = { hits: 0, success: 0, successRate: 0 }
  }

  db[tool].hits += 1
  if (success) db[tool].success += 1

  db[tool].successRate = db[tool].success / db[tool].hits

  fs.writeFileSync(FILE, JSON.stringify(db, null, 2))
}