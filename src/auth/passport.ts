import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Pool } from 'pg'

export function configurePassport(pool: Pool) {
  passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL:  `${process.env.API_URL ?? 'http://localhost:3001'}/auth/google/callback`,
  }, async (_access, _refresh, profile, done) => {
    try {
      const googleId = profile.id
      const email = (profile.emails?.[0]?.value ?? '').toLowerCase()
      const name = profile.displayName
      const picture = profile.photos?.[0]?.value ?? null

      // Look up by google_id OR email — a magic-link account may already exist for
      // this email with no google_id yet, in which case this login should link to
      // (not collide with) that existing account rather than insert a duplicate.
      const { rows: matches } = await pool.query(
        'SELECT id FROM users WHERE google_id = $1 OR email = $2',
        [googleId, email]
      )
      const existingId = matches[0]?.id as number | undefined

      const { rows } = existingId
        ? await pool.query(
            `UPDATE users SET google_id=$1, email=$2, name=$3, picture=$4 WHERE id=$5 RETURNING *`,
            [googleId, email, name, picture, existingId]
          )
        : await pool.query(
            `INSERT INTO users (google_id, email, name, picture) VALUES ($1, $2, $3, $4) RETURNING *`,
            [googleId, email, name, picture]
          )
      done(null, rows[0])
    } catch (e) {
      done(e as Error)
    }
  }))

  passport.serializeUser((user, done) => {
    done(null, (user as Express.User).id)
  })

  passport.deserializeUser(async (id: number, done) => {
    try {
      const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [id])
      done(null, rows[0] ?? false)
    } catch (e) {
      done(e as Error)
    }
  })
}
