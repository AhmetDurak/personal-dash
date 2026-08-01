import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Request } from 'express'
import { registerFinanceTools } from './tools/finance'
import { registerInvestmentTools } from './tools/investments'
import type { ScopeKey } from './scopes'

// Builds a fresh, request-scoped McpServer registering only the tools whose
// scope was granted to this access token — an ungranted scope's tools simply don't exist for this request.
export function createMcpServer(req: Request): McpServer {
  const server = new McpServer(
    { name: 'financedash', version: '1.0.0' },
    { instructions: 'Personal finance dashboard. Finance and investment tools are strictly read-only — there is no way to create, edit, or delete ledger data through this connector.' }
  )

  const scopes = new Set<ScopeKey>(req.mcpScope ?? [])

  if (scopes.has('finance:read')) {
    registerFinanceTools(server, req)
    registerInvestmentTools(server, req)
  }

  return server
}
