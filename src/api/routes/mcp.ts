import { Router, Request, Response } from 'express'
import { Pool } from 'pg'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { requireMcpAuth, attachMcpAgents } from '../../mcp/authMiddleware'
import { createMcpServer } from '../../mcp/server'

// Stateless: a fresh McpServer + transport per request. Simplest option for a
// single-instance deployment — no in-memory session map to manage or scale.
export function mcpRouter(pool: Pool): Router {
  const router = Router()

  router.all('/mcp', requireMcpAuth(pool), attachMcpAgents(pool), async (req: Request, res: Response) => {
    const server = createMcpServer(req, pool)
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })

    res.on('close', () => {
      void transport.close()
      void server.close()
    })

    try {
      await server.connect(transport)
      await transport.handleRequest(req, res, req.body)
    } catch (err) {
      console.error('MCP request failed:', err)
      if (!res.headersSent) res.status(500).json({ error: 'internal_error' })
    }
  })

  return router
}
