import fs from "fs"

const LEARNING_FILE = "./mcp-proxy/logs/learning.json"

function load() {
  try {
    return JSON.parse(fs.readFileSync(LEARNING_FILE, "utf-8"))
  } catch {
    return {}
  }
}

function save(data) {
  fs.writeFileSync(LEARNING_FILE, JSON.stringify(data, null, 2))
}

export function adaptiveFilter(query) {
  const db = load()
  const q = query.toLowerCase()

  const scores = {
    filesystem: 0,
    github: 0
  }

  // base heuristic
  if (q.includes("file") || q.includes("test") || q.includes("log")) {
    scores.filesystem += 1
  }

  if (q.includes("repo") || q.includes("pr") || q.includes("commit")) {
    scores.github += 1
  }

  // learning boost
  for (const [tool, stats] of Object.entries(db)) {
    if (q.includes(tool)) {
      scores[tool] += stats.successRate || 0
    }
  }

  const ranked = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, v]) => v > 0)
    .map(([k]) => k)

  // 🚨 CRITICAL FALLBACK
  if (ranked.length === 0) {
    return ["filesystem"]
  }

  return ranked
}