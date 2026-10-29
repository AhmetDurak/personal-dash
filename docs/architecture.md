# Architecture

Financial data flows through a small pipeline of single-responsibility agents
(see `.claude/architecture/*.md` for the full spec of each):

```mermaid
flowchart LR
  Bank["BankAgent\nPSD2 raw transactions"] --> Category["CategoryAgent\nclassify → Category"]
  Category --> Ledger["LedgerAgent\nCRUD + MonthSummary"]
  Manual["Manual entries"] --> Ledger
  Ledger --> Chart["ChartAgent\nchart-ready datasets"]
  Chart --> UI["UIAgent\nReact / React Native"]
  Ledger --> MCPTools["MCP tools\n(read-only)"]
  Chart --> MCPTools
```

Design rules (enforced across the codebase, see `CLAUDE.md`):

- Manual entries satisfy the same `Transaction` interface as bank-sourced ones.
- Categories and chart types extend via config (`categoryMap.ts`, `CAT_COLORS`), not
  by editing classifier/chart logic.
- Each agent depends on interfaces (`TransactionRepository`), not concrete DB code,
  so a Postgres-backed repo can be swapped for an in-memory one in tests.

## System topology

```mermaid
graph TB
  subgraph Clients
    Web["React Web App"]
    Mobile["Expo / React Native"]
    ClaudeAI["Claude.ai"]
    ChatGPT["ChatGPT"]
  end

  subgraph Server["Express API (Render)"]
    API["/api/* REST routes"]
    Auth["/auth — Google OAuth + sessions"]
    MCPEndpoint["/mcp + /oauth/* — MCP connector"]
    Agents["Ledger / Chart / ETF / Category / Bank agents"]
  end

  DB[("PostgreSQL")]
  Google[("Google OAuth")]
  DBank[("Deutsche Bank PSD2 sandbox")]
  Yahoo[("Yahoo Finance")]
  DeepL[("DeepL API")]
  Vault[("Obsidian vault (optional)")]

  Web --> API
  Web --> Auth
  Mobile --> API
  Mobile --> Auth
  ClaudeAI --> MCPEndpoint
  ChatGPT --> MCPEndpoint

  API --> Agents
  MCPEndpoint --> Agents
  Auth --> Google
  Agents --> DB
  Auth --> DB
  MCPEndpoint --> DB
  Agents --> DBank
  Agents --> Yahoo
  API --> DeepL
  API -.-> Vault
```

## Sequence diagrams

### A normal authenticated request (web/mobile client)

```mermaid
sequenceDiagram
    participant U as User
    participant W as Web/Mobile App
    participant S as Express Server
    participant D as Postgres

    U->>W: Open dashboard
    W->>S: GET /auth/me (session cookie or bearer_token)
    S->>D: SELECT user
    S-->>W: user profile
    W->>S: GET /api/summary/2026-08
    S->>S: requireAuth + attachAgents(userId)
    S->>D: query transactions for month
    D-->>S: rows
    S->>S: LedgerAgent.getSummary()
    S-->>W: MonthSummary JSON
    W-->>U: render charts & KPIs
```

### Connecting Claude/ChatGPT via MCP (OAuth + first tool call)

```mermaid
sequenceDiagram
    participant C as Claude/ChatGPT (MCP client)
    participant B as User's Browser
    participant S as Personal Dashboard server
    participant G as Google OAuth
    participant D as Postgres

    C->>S: GET /.well-known/oauth-authorization-server
    S-->>C: authorize/token/register endpoints

    C->>S: POST /oauth/register (redirect_uris)
    S->>D: INSERT mcp_oauth_clients
    S-->>C: client_id

    C->>B: open /oauth/authorize?client_id&code_challenge&...
    B->>S: GET /oauth/authorize
    S->>S: stash request in session (mcpAuthRequest)
    alt not logged in
        S-->>B: redirect /auth/google
        B->>G: Google login
        G-->>B: redirect /auth/google/callback
        B->>S: GET /auth/google/callback
        S->>D: upsert users, create session
        S-->>B: redirect /mcp-consent
    else already logged in
        S-->>B: redirect /mcp-consent
    end

    B->>S: GET /api/mcp/authorize/pending (session cookie)
    S-->>B: client name + scope groups
    B->>B: user reviews & approves scopes
    B->>S: POST /api/mcp/authorize/decision {approve, scopes}
    S->>D: INSERT mcp_authorization_codes, upsert mcp_consents
    S-->>B: redirect_uri?code=...&state=...
    B->>C: browser navigates back to redirect_uri with code

    C->>S: POST /oauth/token {code, code_verifier}
    S->>S: verify PKCE (S256)
    S->>D: mark code used, INSERT mcp_access_tokens/mcp_refresh_tokens
    S-->>C: access_token + refresh_token

    C->>S: POST /mcp (tools/call finance_get_month_summary) Authorization: Bearer <token>
    S->>D: validate token -> resolve user_id
    S->>S: LedgerAgent(PostgresRepository(pool,userId)).getSummary()
    S-->>C: MonthSummary result
```

## Project structure

```
src/
├── agents/            # BankAgent, CategoryAgent, LedgerAgent, ChartAgent, ETFAgent
├── mcp/               # MCP OAuth server, auth middleware, and tool definitions
│   ├── oauth/         # PKCE, client registration, auth codes, tokens, consent
│   └── tools/         # one file per tool group (finance, notes, language, chains, ...)
├── api/
│   ├── routes/        # one router per feature area (entries, summary, meal, sport, mcp*, ...)
│   └── obsidian/       # optional vault-file backend for Notes
├── auth/              # passport (Google OAuth) configuration
├── db/                # pool.ts, migrate.ts (single idempotent schema blob)
└── types/             # shared Transaction/MonthSummary types, Express augmentation

client/src/            # React web app (tabs/, components/, hooks/, pages/)
mobile/src/            # Expo / React Native app (paused — the PWA covers iPhone/iPad)
.claude/
├── architecture/      # per-agent design docs (BankAgent, LedgerAgent, ChartAgent, ...)
├── agents/            # reviewer sub-agents (e.g. mobile-reviewer.md)
├── tasks/             # backlog.md (planned work)
└── settings.json      # hooks wiring (see "Developing with Claude Code" below)
```

← [Back to README](../README.md)
