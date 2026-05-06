import fs from "fs"

const LOG_FILE = "./mcp-proxy/logs/usage.log.json"

export function logToolUsage(entry) {
  const LOG_FILE = "./mcp-proxy/logs/usage.log.json"

  let logs = []

  try {
    logs = JSON.parse(fs.readFileSync(LOG_FILE, "utf-8"))
  } catch (e) {
    logs = []
  }

  logs.push({
    ...entry,
    timestamp: new Date().toISOString()
  })

  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2))
}