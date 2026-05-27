import { Router, Request, Response } from 'express'

// Primary: DeepL if DEEPL_API_KEY is set, else MyMemory fallback
// Alternatives: MyMemory match list (top 5, deduplicated)
// Examples: English Wiktionary (free, CORS-allowed)
// Per-user keys: see TASK-010 in backlog

const DEEPL_LANG: Record<string, string> = {
  de: 'DE', en: 'EN', tr: 'TR', fr: 'FR', es: 'ES', ja: 'JA',
}

const MM_LANG: Record<string, string> = {
  de: 'de-DE', en: 'en-US', tr: 'tr-TR', fr: 'fr-FR', es: 'es-ES', ja: 'ja-JP',
}

async function translateWithDeepL(text: string, sourceLang: string | undefined, targetLang: string, key: string): Promise<string> {
  const target = DEEPL_LANG[targetLang] ?? targetLang.toUpperCase()
  const body: Record<string, unknown> = { text: [text], target_lang: target }
  if (sourceLang && DEEPL_LANG[sourceLang]) body.source_lang = DEEPL_LANG[sourceLang]
  const host = key.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com'
  const res = await fetch(`https://${host}/v2/translate`, {
    method: 'POST',
    headers: { 'Authorization': `DeepL-Auth-Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json() as { translations: { text: string }[] }
  return data.translations[0]?.text ?? ''
}

async function translateWithMyMemory(text: string, sourceLang: string | undefined, targetLang: string): Promise<string> {
  const src = MM_LANG[sourceLang ?? ''] ?? sourceLang ?? 'autodetect'
  const tgt = MM_LANG[targetLang] ?? targetLang
  const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${src}|${tgt}`)
  if (!res.ok) throw new Error('MyMemory request failed')
  const data = await res.json() as { responseData: { translatedText: string }; responseStatus: number }
  if (data.responseStatus !== 200) throw new Error('MyMemory translation failed')
  return data.responseData.translatedText
}

async function getAlternatives(text: string, sourceLang: string | undefined, targetLang: string, primary: string): Promise<string[]> {
  try {
    const src = MM_LANG[sourceLang ?? ''] ?? sourceLang ?? 'autodetect'
    const tgt = MM_LANG[targetLang] ?? targetLang
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${src}|${tgt}`)
    if (!res.ok) return []
    const data = await res.json() as { matches?: { translation: string; quality: string }[] }
    const seen = new Set([primary.toLowerCase().trim()])
    return (data.matches ?? [])
      .filter(m => parseInt(m.quality) >= 50 && m.translation?.trim())
      .map(m => m.translation.trim())
      .filter(t => { const l = t.toLowerCase(); if (seen.has(l)) return false; seen.add(l); return true })
      .slice(0, 5)
  } catch { return [] }
}

async function getWiktionaryExamples(word: string): Promise<{ source: string; target: string }[]> {
  try {
    const url = `https://en.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(word)}&prop=revisions&rvprop=content&format=json&origin=*`
    const res = await fetch(url)
    if (!res.ok) return []
    const json = await res.json() as { query: { pages: Record<string, { revisions?: { '*': string }[] }> } }
    const page = Object.values(json.query.pages)[0]
    const wikitext = page?.revisions?.[0]?.['*'] ?? ''

    const examples: { source: string; target: string }[] = []
    // {{ux|lang|source sentence|translation=target sentence}}
    const uxRe = /\{\{ux\|[^|]+\|([^|]+)\|[^}]*translation=([^|}]+)/g
    let m
    while ((m = uxRe.exec(wikitext)) !== null && examples.length < 3) {
      const strip = (s: string) => s.replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, '$1').replace(/'{2,}/g, '').trim()
      const src = strip(m[1])
      const tgt = strip(m[2])
      if (src && tgt) examples.push({ source: src, target: tgt })
    }
    return examples
  } catch { return [] }
}

export function translateRouter(): Router {
  const router = Router()

  router.post('/', async (req: Request, res: Response) => {
    const { text, sourceLang, targetLang } = req.body as {
      text: string; sourceLang?: string; targetLang: string
    }

    if (!text?.trim() || !targetLang) {
      res.status(400).json({ error: 'text and targetLang required' }); return
    }

    try {
      const key = process.env.DEEPL_API_KEY
      const translation = key
        ? await translateWithDeepL(text.trim(), sourceLang, targetLang, key)
        : await translateWithMyMemory(text.trim(), sourceLang, targetLang)

      const [alternatives, examples] = await Promise.all([
        getAlternatives(text.trim(), sourceLang, targetLang, translation),
        getWiktionaryExamples(text.trim()),
      ])

      res.json({ translation, alternatives, examples })
    } catch (err) {
      res.status(502).json({ error: String(err) })
    }
  })

  return router
}
