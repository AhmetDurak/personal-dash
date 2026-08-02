import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Request } from 'express'
import type { Pool } from 'pg'
import { registerVocabTools } from './vocab'
import { registerSentenceTools } from './sentence'
import { registerScenarioTools } from './scenario'

// Read+write tools mirroring src/api/routes/notebook.ts's Vocabulary/Sentences/Scenarios endpoints.
// Bulk-import and folder-administration endpoints are intentionally not exposed — this covers
// the day-to-day "add/list/edit/delete/review a card" operations an assistant is actually asked for.
export function registerLanguageTools(server: McpServer, req: Request, pool: Pool) {
  registerVocabTools(server, req, pool)
  registerSentenceTools(server, req, pool)
  registerScenarioTools(server, req, pool)
}
