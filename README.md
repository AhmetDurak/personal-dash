# Personal Dashboard

A personal life dashboard: Deutsche Bank PSD2 cash-flow tracking, budgeting and ETF
watchlists, plus daily-life and learning tools — as a web app that installs on
iPhone/iPad, and as a **remote MCP connector** for Claude and ChatGPT.

## Features

- **Finance** — PSD2 bank sync (Deutsche Bank sandbox), manual entries, categorized
  cash-flow tables, P&L charts, ETF/investment watchlist with live Yahoo Finance data.
- **Life** — planner, journal, meal & nutrition log with shopping lists, sport/workout
  tracking with challenges, reminders.
- **Learn** — notes (optional Obsidian-vault backend), mindmaps, memory palaces, and
  spaced-repetition vocabulary, sentences and scenarios with review-history charts.
- **Habits** — a "Don't break the Chain" tracker.
- **MCP connector** — Claude and ChatGPT can use your dashboard as a tool server, behind
  Google login and a scoped consent screen; AI changes trigger a push notification.
- **Mobile** — installable PWA with Web Push for iPhone/iPad.

**Stack:** React + TypeScript + Tailwind + Recharts · Node.js + Express · PostgreSQL ·
Google OAuth · MCP over Streamable HTTP + OAuth 2.1.

## Quick start

```bash
npm install
cp .env.example .env      # DATABASE_URL, SESSION_SECRET, GOOGLE_CLIENT_ID/SECRET
npm run dev               # API on :3001 (migrations run on boot)

cd client && npm install
npm run dev               # web app, proxies /api and /auth to :3001
```

Visit `/auth/demo` to explore with a seeded demo user, no Google login needed.

## Documentation

| Doc | What's in it |
|---|---|
| [Setup & deployment](docs/setup.md) | Environment variables, iPhone/iPad install, push notifications, keeping Render awake |
| [Architecture](docs/architecture.md) | Agent pipeline, system topology, sequence diagrams, project structure |
| [MCP connector](docs/mcp-connector.md) | Connecting Claude/ChatGPT, available scopes and tools |
| [Developing with Claude Code](docs/development.md) | Sub-agents, hooks, task tracking |
| [Roadmap](docs/roadmap.md) | Planned work and product backlog |
