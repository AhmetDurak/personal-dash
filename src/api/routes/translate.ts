import { Router, Request, Response } from 'express'

// To switch to per-user keys later (TASK-010):
// replace this with a DB lookup: SELECT deepl_api_key FROM users WHERE id=$1
// then fall back to process.env.DEEPL_API_KEY
function getDeepLKey(_userId: number): string | undefined {
  return process.env.DEEPL_API_KEY
}

const DEEPL_LANG: Record<string, string> = {
  de: 'DE', en: 'EN', tr: 'TR', fr: 'FR', es: 'ES', ja: 'JA',
}

export function translateRouter(): Router {
  const router = Router()

  router.post('/', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { text, sourceLang, targetLang } = req.body as {
      text: string
      sourceLang?: string
      targetLang: string
    }

    if (!text?.trim() || !targetLang) {
      res.status(400).json({ error: 'text and targetLang required' }); return
    }

    const key = getDeepLKey(uid)
    if (!key) {
      res.status(503).json({ error: 'DeepL API key not configured' }); return
    }

    const target = DEEPL_LANG[targetLang] ?? targetLang.toUpperCase()
    const body: Record<string, unknown> = { text: [text.trim()], target_lang: target }
    if (sourceLang && DEEPL_LANG[sourceLang]) body.source_lang = DEEPL_LANG[sourceLang]

    // free-tier key ends with ':fx'; paid keys use api.deepl.com
    const host = key.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com'

    const deeplRes = await fetch(`https://${host}/v2/translate`, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!deeplRes.ok) {
      const err = await deeplRes.text()
      res.status(502).json({ error: `DeepL error: ${err}` }); return
    }

    const data = await deeplRes.json() as { translations: { text: string }[] }
    res.json({ translation: data.translations[0]?.text ?? '' })
  })

  return router
}
