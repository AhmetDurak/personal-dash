# MCP connector (Claude / ChatGPT)

Personal Dashboard exposes itself as a remote **MCP server** at `/mcp`, so Claude or ChatGPT
can work with your dashboard data as tools in a normal chat. See the
[sequence diagram](architecture.md#connecting-claudechatgpt-via-mcp-oauth--first-tool-call) for
exactly what happens under the hood — connecting always goes through your existing
Google login plus an explicit consent screen that lists what's being shared.

### Try it with Claude (claude.ai)

1. Make sure your server is deployed and reachable over HTTPS (Render, etc.) — the local
   dev server also works if you connect via a tunnel, but `localhost` alone is not reachable
   from claude.ai's servers.
2. In Claude.ai, go to **Settings → Connectors → Add custom connector**.
3. Enter your server's MCP URL: `https://<your-domain>/mcp`.
4. Claude will register itself as an OAuth client, then open a browser tab that:
   - Logs you into Personal Dashboard with Google (if you aren't already logged in).
   - Shows the **consent screen** — review which scope groups (e.g. "Finance & Investments:
     read-only") you're granting, then click **Allow**.
5. You're redirected back to Claude, and the connector shows as connected. Try asking:
   > "What's my spending summary for this month?"
   > "What does my ETF watchlist look like right now?"
   > "Add a note with today's meeting takeaways."
   > "Mark today as done on my 'Meditate daily' chain."

### Try it with ChatGPT

1. Enable **Developer Mode** in ChatGPT settings (required for custom MCP connectors).
2. Add a custom connector with the same URL: `https://<your-domain>/mcp`.
3. Complete the same Google-login + consent flow as above.
4. Ask ChatGPT the same kind of question — it will call the same tools.

### What's exposed right now

Eight scopes exist today, each granted independently at connect time:

- **`finance:read`** — read-only, deliberately narrow: month summaries, transaction lists,
  top payees, category breakdown, balance trend, income vs. expense (from `LedgerAgent`/
  `ChartAgent`), plus ETF watchlist prices/performance and YTD investment contributions —
  amounts only, no merchant names, no per-holding composition, no bank-connection status.
  No way to create, edit, or delete ledger data.
- **`notes:readwrite`** — full CRUD on Notes, including the Obsidian-vault backend.
- **`mindmap:readwrite`** — full CRUD on Mindmaps.
- **`language:readwrite`** — full CRUD + spaced-repetition review on Vocabulary,
  Sentences, and Scenarios.
- **`chains:readwrite`** — full CRUD on habit Chains.
- **`updates:readwrite`** — publish to and manage the Updates feed.
- **`links:readwrite`** — connections between notes and other items.
- **`transcript:readwrite`** — fetch, save and delete YouTube transcripts.

When the AI adds or changes something through the connector, your devices get a push
notification that opens the changed page (needs push enabled, see [setup](setup.md)).

Your journal is never exposed — there is no `journal:*` scope at all. You can review/revoke
what's connected from the `mcp_consents`/`mcp_access_tokens` tables today; a UI for this is
on the roadmap.

← [Back to README](../README.md)
