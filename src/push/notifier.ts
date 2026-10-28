import webpush from 'web-push'
import type { Pool } from 'pg'
import { buildMessages, localClock, type DueSnapshot, type PushMessage } from './messages'

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env

export const pushConfigured = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY)
if (pushConfigured) {
  webpush.setVapidDetails(VAPID_SUBJECT ?? 'mailto:admin@example.com', VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!)
}

export function vapidPublicKey(): string | null {
  return VAPID_PUBLIC_KEY ?? null
}

interface SubscriptionRow { id: number; endpoint: string; p256dh: string; auth: string }

// Sends one message to every device of a user; prunes subscriptions the push
// service reports as gone. Returns the number of devices reached.
export async function sendToUser(pool: Pool, uid: number, msg: PushMessage): Promise<number> {
  const { rows } = await pool.query<SubscriptionRow>('SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id=$1', [uid])
  const payload = JSON.stringify({ title: msg.title, body: msg.body, url: msg.url, tag: msg.key })
  let reached = 0
  for (const s of rows) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
      reached++
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) await pool.query('DELETE FROM push_subscriptions WHERE id=$1', [s.id])
      else console.error('[push] send failed:', status ?? err)
    }
  }
  return reached
}

async function loadSnapshot(pool: Pool, uid: number, localDate: string): Promise<DueSnapshot> {
  const [reminders, vocab, sentences, scenarios, checkpoints] = await Promise.all([
    pool.query('SELECT id, title, note FROM reminders WHERE user_id=$1 AND done=FALSE AND due_at <= now()', [uid]),
    pool.query('SELECT COUNT(*)::int AS n FROM vocabulary WHERE user_id=$1 AND due_at <= $2::date', [uid, localDate]),
    pool.query('SELECT COUNT(*)::int AS n FROM language_sentences WHERE user_id=$1 AND due_at <= $2::date', [uid, localDate]),
    pool.query('SELECT COUNT(*)::int AS n FROM language_scenarios WHERE user_id=$1 AND due_at <= $2::date', [uid, localDate]),
    pool.query(
      `SELECT c.title AS challenge, cp->>'id' AS id, cp->>'label' AS label, cp->>'target_date' AS target_date
       FROM challenges c, jsonb_array_elements(c.checkpoints) cp
       WHERE c.user_id=$1 AND c.status='active'
         AND NOT COALESCE((cp->>'completed')::boolean, FALSE) AND cp->>'target_date' < $2`,
      [uid, localDate]
    ),
  ])
  return {
    reminders:         reminders.rows,
    vocabDue:          vocab.rows[0].n,
    sentencesDue:      sentences.rows[0].n,
    scenariosDue:      scenarios.rows[0].n,
    missedCheckpoints: checkpoints.rows,
  }
}

// One pass over every user with a push subscription. Safe to run concurrently:
// each message key is claimed in push_sent before it is sent.
export async function pushTick(pool: Pool): Promise<{ users: number; sent: number }> {
  if (!pushConfigured) return { users: 0, sent: 0 }
  await pool.query(`DELETE FROM push_sent WHERE sent_at < now() - interval '30 days'`)

  const { rows: users } = await pool.query<{ user_id: number; tz: string }>(
    'SELECT user_id, MIN(tz) AS tz FROM push_subscriptions GROUP BY user_id'
  )
  let sent = 0
  for (const { user_id: uid, tz } of users) {
    const { date, hour } = localClock(tz, new Date())
    const messages = buildMessages(await loadSnapshot(pool, uid, date), date, hour)
    for (const msg of messages) {
      const { rowCount } = await pool.query(
        'INSERT INTO push_sent (user_id, key) VALUES ($1,$2) ON CONFLICT DO NOTHING', [uid, msg.key]
      )
      if (rowCount) sent += await sendToUser(pool, uid, msg)
    }
  }
  return { users: users.length, sent }
}
