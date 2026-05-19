import axios from 'axios'
import { createHash, randomBytes } from 'crypto'
import { consumeVerifier } from './auth'

const BASE = 'https://simulator-api.db.com'

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function extractCsrf(html: string): string {
  const m = html.match(/name="_csrf"\s+value="([^"]+)"/)
  if (!m) throw new Error('Could not find _csrf token in page')
  return m[1]
}

function extractFormAction(html: string, baseUrl: string): string {
  const m = html.match(/action="([^"]+)"/)
  if (!m) throw new Error('Could not find form action in page')
  const action = m[1]
  if (action.startsWith('http')) return action
  const base = new URL(baseUrl)
  return base.origin + action
}

function extractCode(locationHeader: string): string {
  const m = locationHeader.match(/[?&]code=([\w.\-]+)/)
  if (!m) throw new Error(`No code in redirect: ${locationHeader}`)
  return m[1]
}

/**
 * Performs the full automated PKCE + simulator login flow.
 * Returns an access token that can be used with BankAgent.
 */
export async function performSimulatorLogin(): Promise<{ accessToken: string; refreshToken?: string }> {
  const fkn = process.env.DB_FKN
  const pin = process.env.DB_PIN
  const clientId = process.env.DB_CLIENT_ID
  const redirectUri = process.env.DB_REDIRECT_URI
  if (!fkn || !pin || !clientId || !redirectUri) {
    throw new Error('Missing DB_FKN, DB_PIN, DB_CLIENT_ID, or DB_REDIRECT_URI')
  }

  // Step 0 — PKCE
  const verifier = base64url(randomBytes(32))
  const challenge = base64url(createHash('sha256').update(verifier).digest())
  const state = base64url(randomBytes(16))

  const http = axios.create({
    maxRedirects: 0,
    validateStatus: s => s < 500,
    withCredentials: true,
  })

  let jsessionid = ''

  function cookieHeader(): Record<string, string> {
    return jsessionid ? { Cookie: `JSESSIONID=${jsessionid}` } : {}
  }

  function updateSession(setCookie: string | string[] | undefined) {
    if (!setCookie) return
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]
    for (const c of cookies) {
      const m = c.match(/JSESSIONID=([^;]+)/)
      if (m) jsessionid = m[1]
    }
  }

  // Step 1 — initial authorize request
  const step1 = await http.get(`${BASE}/gw/oidc/authorize`, {
    params: {
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'read_accounts',
      code_challenge_method: 'S256',
      code_challenge: challenge,
      state,
    },
  })
  updateSession(step1.headers['set-cookie'])
  const loginUrl = step1.headers['location']
  if (!loginUrl) {
    const body = typeof step1.data === 'string' ? step1.data.slice(0, 500) : JSON.stringify(step1.data)
    throw new Error(`Step 1: no Location header (status=${step1.status}): ${body}`)
  }

  // Step 2 — follow redirect to login page
  const loginPageUrl = loginUrl.startsWith('http') ? loginUrl : `${BASE}${loginUrl}`
  const step2 = await http.get(loginPageUrl, { headers: cookieHeader() })
  updateSession(step2.headers['set-cookie'])
  const loginHtml: string = step2.data

  // Step 3.1 — POST login form with FKN/PIN
  const csrf1 = extractCsrf(loginHtml)
  const loginActionUrl = extractFormAction(loginHtml, loginPageUrl)

  const step3 = await http.post(
    loginActionUrl,
    new URLSearchParams({ username: fkn, password: pin, _csrf: csrf1, submit: 'Login' }),
    {
      headers: {
        ...cookieHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  )
  updateSession(step3.headers['set-cookie'])
  const afterLoginLocation = step3.headers['location']
  if (!afterLoginLocation) throw new Error('Step 3.1: no Location after login')
  if (afterLoginLocation.includes('noaccess') || afterLoginLocation.includes('failure') || afterLoginLocation.includes('commonerror')) {
    throw new Error(`Login failed — invalid FKN/PIN or account locked. Location: ${afterLoginLocation}`)
  }

  // Step 3.2 — follow to consent page
  const consentPageUrl = afterLoginLocation.startsWith('http') ? afterLoginLocation : `${BASE}${afterLoginLocation}`
  const step3b = await http.get(consentPageUrl, { headers: cookieHeader() })
  updateSession(step3b.headers['set-cookie'])

  // If already consented, the server may redirect straight to the callback with code
  const directCode = step3b.headers['location']
  if (directCode && directCode.includes('code=')) {
    const code = extractCode(directCode)
    return exchangeCode(code, verifier, clientId, redirectUri)
  }

  const consentHtml: string = step3b.data
  const csrf2 = extractCsrf(consentHtml)
  const consentActionUrl = extractFormAction(consentHtml, consentPageUrl)

  // Step 3.2 — POST consent
  const step3c = await http.post(
    consentActionUrl,
    new URLSearchParams({
      user_oauth_approval: 'true',
      _csrf: csrf2,
      remember: 'none',
      scope_read_accounts: 'read_accounts',
    }),
    {
      headers: {
        ...cookieHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  )
  updateSession(step3c.headers['set-cookie'])

  // Step 4 — extract code from redirect Location
  const codeLocation = step3c.headers['location']
  if (!codeLocation) throw new Error('Step 3.2: no Location after consent')
  const code = extractCode(codeLocation)

  // Step 5 — exchange code for tokens
  return exchangeCode(code, verifier, clientId, redirectUri)
}

async function exchangeCode(
  code: string,
  verifier: string,
  clientId: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken?: string }> {
  const { data } = await axios.post(
    `${BASE}/gw/oidc/token`,
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier,
      client_id: clientId,
      redirect_uri: redirectUri,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )
  if (!data.access_token) throw new Error(`Token exchange failed: ${JSON.stringify(data)}`)
  return { accessToken: data.access_token, refreshToken: data.refresh_token }
}
