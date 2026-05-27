import { Router, Request, Response } from 'express'

// Primary: MyMemory (free, no key, 1000 req/day)
// Optional upgrade: set DEEPL_API_KEY in .env to use DeepL instead
// Per-user keys: see TASK-010 in backlog

const DEEPL_LANG: Record<string, string> = {
  de: 'DE', en: 'EN', tr: 'TR', fr: 'FR', es: 'ES', ja: 'JA',
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
  const src = sourceLang ?? 'autodetect'
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${src}|${targetLang}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('MyMemory request failed')
  const data = await res.json() as { responseData: { translatedText: string }; responseStatus: number }
  if (data.responseStatus !== 200) throw new Error('MyMemory translation failed')
  return data.responseData.translatedText
}

export function translateRouter(): Router {
  const router = Router()

  router.post('/', async (req: Request, res: Response) => {
    const { text, sourceLang, targetLang } = req.body as {
      text: string
      sourceLang?: string
      targetLang: string
    }

    if (!text?.trim() || !targetLang) {
      res.status(400).json({ error: 'text and targetLang required' }); return
    }

    try {
      const deeplKey = process.env.DEEPL_API_KEY
      const translation = deeplKey
        ? await translateWithDeepL(text.trim(), sourceLang, targetLang, deeplKey)
        : await translateWithMyMemory(text.trim(), sourceLang, targetLang)
      res.json({ translation })
    } catch (err) {
      res.status(502).json({ error: String(err) })
    }
  })

  return router
}
