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
      const { rows } = await pool.query(
        `INSERT INTO users (google_id, email, name, picture)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (google_id) DO UPDATE SET email=$2, name=$3, picture=$4
         RETURNING *`,
        [
          profile.id,
          profile.emails?.[0]?.value ?? '',
          profile.displayName,
          profile.photos?.[0]?.value ?? null,
        ]
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
