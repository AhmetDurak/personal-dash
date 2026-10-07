import { Router, Request, Response } from 'express'
import { Pool } from 'pg'
import { YoutubeTranscript } from 'youtube-transcript'

function toCamel(row: Record<string, unknown>) {
  return {
    id: row.id,
    url: row.url,
    videoId: row.video_id,
    title: row.title,
    transcriptText: row.transcript_text,
    folder: row.folder,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function fetchVideoTitle(videoId: string): Promise<string> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`)
    if (!res.ok) return videoId
    const data = await res.json() as { title?: string }
    return data.title?.trim() || videoId
  } catch {
    return videoId
  }
}

async function fetchYoutubeTranscript(url: string): Promise<{ videoId: string; title: string; transcriptText: string }> {
  const videoId = extractVideoId(url)
  const segments = await YoutubeTranscript.fetchTranscript(url)
  const title = await fetchVideoTitle(videoId)
  const transcriptText = segments.map(s => s.text).join(' ').replace(/\s+/g, ' ').trim()
  return { videoId, title, transcriptText }
}

function extractVideoId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const re of patterns) {
    const m = url.match(re)
    if (m) return m[1]
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim()
  throw new Error('Could not parse a YouTube video ID from that URL')
}

export function transcriptRouter(pool: Pool): Router {
  const router = Router()

  router.post('/preview', async (req: Request, res: Response) => {
    const { url } = req.body as { url: string }
    if (!url?.trim()) { res.status(400).json({ error: 'url required' }); return }
    try {
      const { videoId, title, transcriptText } = await fetchYoutubeTranscript(url.trim())
      res.json({ videoId, title, transcriptText })
    } catch (err) {
      res.status(502).json({ error: err instanceof Error ? err.message : String(err) })
    }
  })

  router.get('/', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query('SELECT * FROM transcripts WHERE user_id = $1 ORDER BY created_at DESC', [uid])
    res.json(rows.map(toCamel))
  })

  router.post('/', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { url, folder } = req.body as { url: string; folder?: string | null }
    if (!url?.trim()) { res.status(400).json({ error: 'url required' }); return }
    try {
      const { videoId, title, transcriptText } = await fetchYoutubeTranscript(url.trim())
      const { rows } = await pool.query(
        `INSERT INTO transcripts (url, video_id, title, transcript_text, user_id, folder)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [url.trim(), videoId, title, transcriptText, uid, folder || null]
      )
      res.json(toCamel(rows[0]))
    } catch (err) {
      res.status(502).json({ error: err instanceof Error ? err.message : String(err) })
    }
  })

  router.delete('/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    await pool.query('DELETE FROM transcripts WHERE id=$1 AND user_id=$2', [req.params.id, uid])
    res.json({ ok: true })
  })

  router.patch('/:id/folder', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { folder } = req.body as { folder: string | null }
    const { rows } = await pool.query(
      'UPDATE transcripts SET folder=$1, updated_at=now() WHERE id=$2 AND user_id=$3 RETURNING *',
      [folder ?? null, req.params.id, uid]
    )
    res.json(rows[0] ? toCamel(rows[0]) : null)
  })

  router.patch('/folder-rename', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { oldPath, newPath } = req.body as { oldPath: string; newPath: string }
    if (!oldPath?.trim() || !newPath?.trim()) { res.status(400).json({ error: 'oldPath and newPath required' }); return }
    await pool.query(
      `UPDATE transcripts SET folder = CASE WHEN folder = $1 THEN $2 ELSE $2 || SUBSTRING(folder FROM LENGTH($1) + 1) END
       WHERE user_id = $3 AND (folder = $1 OR folder LIKE $4)`,
      [oldPath, newPath, uid, oldPath + '/%']
    )
    res.json({ ok: true })
  })

  router.delete('/folder', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { path } = req.query as { path: string }
    if (!path?.trim()) { res.status(400).json({ error: 'path required' }); return }
    await pool.query(
      `DELETE FROM transcripts WHERE user_id = $1 AND (folder = $2 OR folder LIKE $3)`,
      [uid, path, path + '/%']
    )
    res.json({ ok: true })
  })

  return router
}
