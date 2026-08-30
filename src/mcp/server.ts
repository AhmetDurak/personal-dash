import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Request } from 'express'
import type { Pool } from 'pg'
import { registerFinanceTools } from './tools/finance'
import { registerInvestmentTools } from './tools/investments'
import { registerNotesTools } from './tools/notes'
import { registerMindmapTools } from './tools/mindmap'
import { registerLanguageTools } from './tools/language'
import { registerChainsTools } from './tools/chains'
import { registerUpdatesTools } from './tools/updates'
import type { ScopeKey } from './scopes'

// Builds a fresh, request-scoped McpServer registering only the tools whose
// scope was granted to this access token — an ungranted scope's tools simply don't exist for this request.
export function createMcpServer(req: Request, pool: Pool): McpServer {
  const server = new McpServer(
    { name: 'financedash', version: '1.0.0' },
    { instructions: 'Personal finance dashboard. Finance and investment tools are strictly read-only — there is no way to create, edit, or delete ledger data through this connector. Other tool groups (Notes, Mindmap, Language, Chains, Updates) support full read/write, scoped to what the user granted at connection time.' }
  )

  const scopes = new Set<ScopeKey>(req.mcpScope ?? [])

  if (scopes.has('finance:read')) {
    registerFinanceTools(server, req)
    registerInvestmentTools(server, req)
  }

  if (scopes.has('notes:readwrite')) {
    registerNotesTools(server, req, pool)
  }

  if (scopes.has('mindmap:readwrite')) {
    registerMindmapTools(server, req, pool)
  }

  if (scopes.has('language:readwrite')) {
    registerLanguageTools(server, req, pool)
  }

  if (scopes.has('chains:readwrite')) {
    registerChainsTools(server, req, pool)
  }

  if (scopes.has('updates:readwrite')) {
    registerUpdatesTools(server, req, pool)
  }

  return server
}
