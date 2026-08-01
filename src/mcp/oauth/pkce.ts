import crypto from 'crypto'

function base64url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const computed = base64url(crypto.createHash('sha256').update(codeVerifier).digest())
  return computed === codeChallenge
}
