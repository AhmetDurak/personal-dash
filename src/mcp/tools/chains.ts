import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Request } from 'express'
import type { Pool } from 'pg'
import type { ChainMark } from '../../api/routes/chains'

function json(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] }
}

function uidOf(req: Request): number {
  return (req.user as Express.User).id
}

// Read+write tools mirroring src/api/routes/chains.ts — the "Don't break the Chain" habit tracker.
export function registerChainsTools(server: McpServer, req: Request, pool: Pool) {
  server.registerTool('chains_list', {
    title: 'List chains',
    description: 'List all habit chains with their current check/cross marks, newest first.',
    inputSchema: {},
  }, async () => {
    const uid = uidOf(req)
    const { rows } = await pool.query('SELECT * FROM chains WHERE user_id = $1 ORDER BY created_at DESC', [uid])
    return json(rows)
  })

  server.registerTool('chains_create', {
    title: 'Create a chain',
    description: 'Create a new habit chain with a given number of days/links, all initially unmarked.',
    inputSchema: {
      name: z.string().describe('e.g. "Meditate daily"'),
      length: z.number().int().min(1).max(366).describe('Number of days/links in the chain'),
    },
  }, async ({ name, length }) => {
    const uid = uidOf(req)
    const marks: ChainMark[] = Array(length).fill(null)
    const { rows } = await pool.query(
      'INSERT INTO chains (name, length, marks, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name.trim(), length, JSON.stringify(marks), uid]
    )
    return json(rows[0])
  })

  server.registerTool('chains_set_mark', {
    title: 'Mark a day in a chain',
    description: 'Set a specific day/link in a chain to checked, crossed (broken), or cleared.',
    inputSchema: {
      id: z.string().describe('Chain id'),
      index: z.number().int().min(0).describe('Zero-based day index within the chain'),
      mark: z.enum(['check', 'cross', 'none']).describe('"check" = done, "cross" = broken/missed, "none" = clear the mark'),
    },
  }, async ({ id, index, mark }) => {
    const uid = uidOf(req)
    const { rows } = await pool.query('SELECT * FROM chains WHERE id=$1 AND user_id=$2', [id, uid])
    const chain = rows[0] as { name: string; length: number; marks: ChainMark[] } | undefined
    if (!chain) return json(null)
    if (index >= chain.length) return json({ error: 'index out of range' })
    const marks = [...chain.marks]
    marks[index] = mark === 'none' ? null : mark
    const { rows: updated } = await pool.query(
      'UPDATE chains SET marks=$1 WHERE id=$2 AND user_id=$3 RETURNING *',
      [JSON.stringify(marks), id, uid]
    )
    return json(updated[0])
  })

  server.registerTool('chains_delete', {
    title: 'Delete a chain',
    description: 'Permanently delete a habit chain.',
    inputSchema: { id: z.string() },
  }, async ({ id }) => {
    const uid = uidOf(req)
    await pool.query('DELETE FROM chains WHERE id=$1 AND user_id=$2', [id, uid])
    return json({ ok: true })
  })
}
