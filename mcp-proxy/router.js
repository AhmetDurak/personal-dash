import { adaptiveFilter } from './adaptive-router.js'
import { updateLearning } from './learning.js'
import { logToolUsage } from './telemetry.js'
import { compressResponse } from './compression.js'
import { callMCPTool } from './mcp-client.js'

export async function routeRequest({ serverName, toolName, args }) {
  const start = Date.now()

  const allowedServers = adaptiveFilter(toolName)

  if (!allowedServers.includes(serverName)) {
    logToolUsage({ tool: serverName, query: toolName, duration: 0, size: 0, status: 'blocked' })
    updateLearning({ tool: serverName, success: false })
    throw new Error(`Blocked by adaptive router: ${serverName}`)
  }

  const raw = await callMCPTool(serverName, toolName, args)

  const result = compressResponse(raw, serverName)

  const duration = Date.now() - start
  logToolUsage({ tool: serverName, query: toolName, duration, size: JSON.stringify(raw).length })
  updateLearning({ tool: serverName, success: true })

  return result
}
