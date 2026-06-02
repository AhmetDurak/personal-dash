import { Router, Request, Response } from 'express'
import multer from 'multer'
import { Pool } from 'pg'
import path from 'path'
import { mkdir, unlink } from 'fs/promises'
import { createReadStream, existsSync } from 'fs'
import { randomUUID } from 'crypto'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'receipts')

// Ensure upload dir exists on first request (not startup, avoids issues in CI)
async function ensureDir() {
  await mkdir(UPLOAD_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    await ensureDir()
    cb(null, UPLOAD_DIR)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${randomUUID()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
    cb(null, allowed.includes(file.mimetype))
  },
})

export function receiptsRouter(pool: Pool): Router {
  const router = Router()

  // POST /api/receipts/:date  — upload receipt for a shopping date
  router.post('/:date', upload.single('receipt'), async (req: Request, res: Response) => {
    if (!req.file) { res.status(400).json({ error: 'No file or unsupported type' }); return }
    const uid  = (req.user as Express.User).id
    const date = req.params.date
    const { rows } = await pool.query(
      `INSERT INTO receipt_uploads (user_id, date, filename, orig_name, mime_type, size_bytes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [uid, date, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size]
    )
    res.json(rows[0])
  })

  // GET /api/receipts/:date  — list receipts for a date
  router.get('/:date', async (req: Request, res: Response) => {
    const uid  = (req.user as Express.User).id
    const { rows } = await pool.query(
      'SELECT * FROM receipt_uploads WHERE user_id=$1 AND date=$2 ORDER BY created_at ASC',
      [uid, req.params.date]
    )
    res.json(rows)
  })

  // GET /api/receipts/file/:id  — serve the file
  router.get('/file/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query(
      'SELECT * FROM receipt_uploads WHERE id=$1 AND user_id=$2',
      [req.params.id, uid]
    )
    if (!rows[0]) { res.status(404).json({ error: 'Not found' }); return }
    const filePath = path.join(UPLOAD_DIR, rows[0].filename)
    if (!existsSync(filePath)) { res.status(404).json({ error: 'File missing' }); return }
    res.setHeader('Content-Type', rows[0].mime_type)
    res.setHeader('Content-Disposition', `inline; filename="${rows[0].orig_name}"`)
    createReadStream(filePath).pipe(res)
  })

  // DELETE /api/receipts/:id  — delete a receipt
  router.delete('/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query(
      'DELETE FROM receipt_uploads WHERE id=$1 AND user_id=$2 RETURNING filename',
      [req.params.id, uid]
    )
    if (rows[0]) {
      const filePath = path.join(UPLOAD_DIR, rows[0].filename)
      await unlink(filePath).catch(() => undefined)
    }
    res.json({ ok: true })
  })

  return router
}
