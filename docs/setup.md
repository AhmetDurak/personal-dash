# Setup & deployment

**Prerequisites:** Node.js, PostgreSQL running locally, a Google OAuth2 client
(console.cloud.google.com).

```bash
npm install
cp .env.example .env      # fill in DATABASE_URL, SESSION_SECRET, GOOGLE_CLIENT_ID/SECRET
npm run db:migrate        # or just start the server — migrate() runs automatically on boot
npm run dev                # API on :3001, ts-node-dev with hot reload
```

In another terminal, for the web client:

```bash
cd client
npm install
npm run dev                # Vite dev server, proxies /api and /auth to :3001
```

Key environment variables (see `.env.example` for the full list):

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `SESSION_SECRET` | express-session cookie signing secret |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth2 credentials |
| `API_URL` | Public origin of the server — also used as the MCP OAuth issuer/resource base |
| `DB_CLIENT_ID` / `DB_CLIENT_SECRET` / `DB_REDIRECT_URI` / `DB_API_BASE` | Deutsche Bank PSD2 sandbox |
| `DEEPL_API_KEY` | Optional, enables in-app translation |
| `OBSIDIAN_VAULT_PATH` | Optional, stores Notes as markdown files in an Obsidian vault instead of Postgres |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Optional, enables Web Push notifications (`npx web-push generate-vapid-keys`) |
| `PUSH_CRON_SECRET` | Optional, bearer secret for the external cron calling `POST /push/tick` |

### iPhone / iPad (installable web app + push)

The web client is a PWA: in Safari tap **Share → Add to Home Screen**, open *Dashboard*
from the home screen, sign in **with Google** (a magic link would open in Safari, whose
login is separate from the installed app), then open the bell menu → **Enable**.
Push needs iOS/iPadOS 16.4+.

Pushes (due reminders; after 08:00 local time also overdue challenge checkpoints,
language reviews and ≥20 due vocab cards) are sent by the server. It checks every minute
while awake; because Render's free plan sleeps when idle, also point an external cron
(e.g. cron-job.org, every 5 min) at:

```bash
curl -X POST https://<your-app>.onrender.com/push/tick -H "Authorization: Bearer $PUSH_CRON_SECRET"
```

### Keeping Render awake

Render's free plan sleeps after ~15 minutes without traffic (the next visit then takes
30–60 s to wake). The push cron above also keeps it awake — schedule it **more often than
every 15 minutes** (e.g. `*/10`); a plain `GET /health` works too if you don't need push.
The free plan gives 750 instance hours per month per workspace, enough for one always-on
service. A paid plan (`plan: starter` in `render.yaml`) never sleeps.

No demo credentials needed to explore the app locally: visiting `/auth/demo` auto-seeds
a demo user and logs you in without going through Google.

← [Back to README](../README.md)
