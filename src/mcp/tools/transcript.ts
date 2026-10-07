import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Request } from 'express'
import type { Pool } from 'pg'
import { fetchYoutubeTranscript } from '../../api/routes/transcript'

function json(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] }
}

function uidOf(req: Request): number {
  return (req.user as Express.User).id
}

// Read+write tools mirroring src/api/routes/transcript.ts — lets a connected
// Claude session fetch a YouTube video's transcript directly into the user's
// Transcript library (e.g. "save the transcript of this video, then summarize it").
export function registerTranscriptTools(server: McpServer, req: Request, pool: Pool) {
  server.registerTool('transcript_list', {
    title: 'List saved transcripts',
    description: 'List all saved YouTube transcripts, most recently created first.',
    inputSchema: {},
  }, async () => {
    const uid = uidOf(req)
    const { rows } = await pool.query('SELECT * FROM transcripts WHERE user_id = $1 ORDER BY created_at DESC', [uid])
    return json(rows)
  })

  server.registerTool('transcript_get', {
    title: 'Get a saved transcript',
    description: 'Get a single saved transcript by id, including its full text.',
    inputSchema: { id: z.number().int() },
  }, async ({ id }) => {
    const uid = uidOf(req)
    const { rows } = await pool.query('SELECT * FROM transcripts WHERE id = $1 AND user_id = $2', [id, uid])
    return json(rows[0] ?? null)
  })

  server.registerTool('transcript_fetch', {
    title: 'Fetch and save a YouTube transcript',
    description: 'Fetch the transcript of a YouTube video (by URL) and save it to the user\'s Transcript library. Fails if the video has no captions available.',
    inputSchema: {
      url: z.string().describe('A YouTube video URL (watch, youtu.be, or shorts link)'),
      folder: z.string().nullable().optional().describe('Folder path, e.g. "Lectures". Omit or null for the root folder.'),
    },
  }, async ({ url, folder }) => {
    const uid = uidOf(req)
    try {
      const { videoId, title, transcriptText } = await fetchYoutubeTranscript(url.trim())
      const { rows } = await pool.query(
        `INSERT INTO transcripts (url, video_id, title, transcript_text, user_id, folder)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [url.trim(), videoId, title, transcriptText, uid, folder ?? null]
      )
      return json(rows[0])
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : String(err) })
    }
  })

  server.registerTool('transcript_delete', {
    title: 'Delete a saved transcript',
    description: 'Permanently delete a saved transcript.',
    inputSchema: { id: z.number().int() },
  }, async ({ id }) => {
    const uid = uidOf(req)
    await pool.query('DELETE FROM transcripts WHERE id=$1 AND user_id=$2', [id, uid])
    return json({ ok: true })
  })
}
