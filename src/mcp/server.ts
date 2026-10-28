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
import { registerLinksTools } from './tools/links'
import { registerTranscriptTools } from './tools/transcript'
import type { ScopeKey } from './scopes'
import { pushConfigured, sendToUser } from '../push/notifier'
import { mcpWriteMessage } from '../push/mcpActivity'

type ToolResult = { content: Array<{ type: string; text?: string }>; isError?: boolean }

// Wraps every tool handler so a successful write pushes a notification to the
// user's devices (fire-and-forget — never delays or fails the tool call).
function notifyOnWrites(server: McpServer, req: Request, pool: Pool) {
  if (!pushConfigured) return
  const register = server.registerTool.bind(server)
  server.registerTool = ((name: string, config: unknown, cb: (...args: unknown[]) => Promise<ToolResult>) =>
    register(name, config as never, (async (...args: unknown[]) => {
      const result = await cb(...args)
      const text = result.content[0]?.text
      const msg = !result.isError && text !== undefined ? mcpWriteMessage(name, text) : null
      if (msg) sendToUser(pool, (req.user as Express.User).id, msg).catch(err => console.error('[push] mcp notify failed:', err))
      return result
    }) as never)) as typeof server.registerTool
}

// Builds a fresh, request-scoped McpServer registering only the tools whose
// scope was granted to this access token — an ungranted scope's tools simply don't exist for this request.
export function createMcpServer(req: Request, pool: Pool): McpServer {
  const server = new McpServer(
    { name: 'financedash', version: '1.0.0' },
    { instructions: 'Personal finance dashboard. Finance and investment tools are strictly read-only — there is no way to create, edit, or delete ledger data through this connector. Other tool groups (Notes, Mindmap, Language, Chains, Updates, Connections, Transcript) support full read/write, scoped to what the user granted at connection time.' }
  )

  notifyOnWrites(server, req, pool)

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

  if (scopes.has('links:readwrite')) {
    registerLinksTools(server, req, pool)
  }

  if (scopes.has('transcript:readwrite')) {
    registerTranscriptTools(server, req, pool)
  }

  return server
}
