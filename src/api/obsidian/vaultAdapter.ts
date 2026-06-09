import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const rawPath = process.env.OBSIDIAN_VAULT_PATH ?? ''
const VAULT = rawPath ? rawPath.replace(/^~/, process.env.HOME ?? '') : ''

interface NoteRow {
  id: string
  title: string
  content: string
  folder: string | null
  user_id: number
  created_at: string
  updated_at: string
}

// ─── Frontmatter helpers ──────────────────────────────────────────────────────

function parseFm(raw: string): { meta: Record<string, string>; body: string } {
  if (!raw.startsWith('---\n')) return { meta: {}, body: raw }
  const end = raw.indexOf('\n---\n', 4)
  if (end === -1) return { meta: {}, body: raw }
  const meta: Record<string, string> = {}
  for (const line of raw.slice(4, end).split('\n')) {
    const colon = line.indexOf(':')
    if (colon === -1) continue
    meta[line.slice(0, colon).trim()] = line.slice(colon + 1).trim()
  }
  return { meta, body: raw.slice(end + 5) }
}

function buildFm(meta: Record<string, string>, body: string): string {
  const lines = Object.entries(meta).map(([k, v]) => `${k}: ${v}`)
  return `---\n${lines.join('\n')}\n---\n\n${body}`
}

function slugify(title: string): string {
  return (title || 'untitled').replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, ' ').trim()
}

// ─── Walk vault directory ─────────────────────────────────────────────────────

function* walkMd(dir: string): Generator<string> {
  let entries: fs.Dirent[]
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) yield* walkMd(full)
    else if (e.name.endsWith('.md')) yield full
  }
}

function readNote(filePath: string): NoteRow | null {
  try {
    const { meta, body } = parseFm(fs.readFileSync(filePath, 'utf8'))
    if (!meta.id) return null
    const rel = path.relative(VAULT, filePath)
    const parts = rel.split(path.sep)
    return {
      id: meta.id,
      title: meta.title ?? path.basename(filePath, '.md'),
      content: body.trim(),
      folder: parts.length > 1 ? parts.slice(0, -1).join('/') : null,
      user_id: parseInt(meta.user_id ?? '0', 10),
      created_at: meta.created_at ?? new Date().toISOString(),
      updated_at: meta.updated_at ?? new Date().toISOString(),
    }
  } catch {
    return null
  }
}

function notePath(folder: string | null, title: string): string {
  const filename = slugify(title) + '.md'
  return folder ? path.join(VAULT, folder, filename) : path.join(VAULT, filename)
}

function writeMeta(note: NoteRow): Record<string, string> {
  return { id: note.id, title: note.title, user_id: String(note.user_id), created_at: note.created_at, updated_at: note.updated_at }
}

// ─── Public adapter ───────────────────────────────────────────────────────────

export const vault = {
  enabled: () => !!VAULT,

  list(userId: number): NoteRow[] {
    const notes: NoteRow[] = []
    for (const fp of walkMd(VAULT)) {
      const n = readNote(fp)
      if (n && n.user_id === userId) notes.push(n)
    }
    return notes.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  },

  find(id: string, userId: number): { note: NoteRow; filePath: string } | null {
    for (const fp of walkMd(VAULT)) {
      const n = readNote(fp)
      if (n && n.id === id && n.user_id === userId) return { note: n, filePath: fp }
    }
    return null
  },

  create(title: string, content: string, folder: string | null, userId: number): NoteRow {
    const now = new Date().toISOString()
    const note: NoteRow = { id: uuidv4(), title, content, folder, user_id: userId, created_at: now, updated_at: now }
    let fp = notePath(folder, title)
    fs.mkdirSync(path.dirname(fp), { recursive: true })
    if (fs.existsSync(fp)) fp = notePath(folder, title + '-' + note.id.slice(0, 8))
    fs.writeFileSync(fp, buildFm(writeMeta(note), content), 'utf8')
    return note
  },

  update(id: string, title: string, content: string, userId: number): NoteRow | null {
    const found = this.find(id, userId)
    if (!found) return null
    const now = new Date().toISOString()
    const updated = { ...found.note, title, content, updated_at: now }
    const newFp = notePath(updated.folder, title)
    fs.mkdirSync(path.dirname(newFp), { recursive: true })
    fs.writeFileSync(newFp, buildFm(writeMeta(updated), content), 'utf8')
    if (newFp !== found.filePath) fs.unlinkSync(found.filePath)
    return updated
  },

  updateFolder(id: string, folder: string | null, userId: number): NoteRow | null {
    const found = this.find(id, userId)
    if (!found) return null
    const now = new Date().toISOString()
    const updated = { ...found.note, folder, updated_at: now }
    const newFp = notePath(folder, updated.title)
    fs.mkdirSync(path.dirname(newFp), { recursive: true })
    fs.writeFileSync(newFp, buildFm(writeMeta(updated), updated.content), 'utf8')
    if (newFp !== found.filePath) fs.unlinkSync(found.filePath)
    return updated
  },

  delete(id: string, userId: number): void {
    const found = this.find(id, userId)
    if (found) fs.unlinkSync(found.filePath)
  },
}
