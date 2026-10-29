# Roadmap

**MCP connector** (this is being built incrementally — see the plan file used during
development for full detail):

- [x] Phase 1 — OAuth 2.1 authorization server (dynamic client registration, PKCE,
      RFC 8414/9728 discovery), reusing the existing Google login
- [x] Phase 2 — `/mcp` Streamable HTTP endpoint + read-only Finance/Investments tools
- [x] Phase 3 — Notes tools (read + write), including the Obsidian-vault backend
- [x] Phase 4 — Mindmap tools (read + write)
- [x] Phase 5 — Language tools (read + write): vocabulary, sentences, scenarios, with
      spaced-repetition review
- [x] Phase 6 — Chains tools (read + write) — required first migrating the "Don't break
      the Chain" habit tracker from browser `localStorage` to a real `chains` table
      (existing local chains auto-migrate to the server on next page load)
- [x] Updates feed, Connections (links) and Transcript tools (read + write)
- [ ] Reminders tools (read + write)
- [ ] Meal tools (Foods/Logs/Shopping; recipes need a server-side home first —
      they're currently browser-`localStorage`-only)
- [ ] Sport tools (exercises, templates, logs, targets, challenges, weight, schedule)
- [ ] Production deploy + register the connector in Claude.ai and ChatGPT,
      end-to-end verification; stretch: a "Connected Apps" panel to view/revoke access

**Product backlog** (see `.claude/tasks/backlog.md` for the live, up-to-date list):

- AI-assisted transaction categorization (LLM-suggested categories on import, with a
  "correct this" feedback loop)
- Full PSD2 / Deutsche Bank OAuth2 integration against the production API (currently
  sandbox/simulator)
- Recurring-template automation (auto-generate transactions from active templates)
- Grocery receipt upload with OCR (Lidl/Aldi/Kaufland/Rewe) into shopping lists or food logs
- Per-user DeepL API keys, once multi-user usage warrants it
- Continued React Native / Expo parity with the web app

← [Back to README](../README.md)
