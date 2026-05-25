# Task Backlog

Difficulty: 1 (trivial) → 10 (very hard)
Priority: High / Medium / Low

---

## TASK-003 — Budget Tracking UI

**Difficulty:** 5/10
**Priority:** Medium

- Per-category monthly budget input (already have `budgets` table)
- Visual progress bars on Overview and Transactions tabs
- Alert when a category exceeds budget

---

## TASK-004 — AI Transaction Categorization

**Difficulty:** 7/10
**Priority:** Medium

- Call LLM (or local rules engine) to suggest category when importing bank/CSV transactions
- Fallback to current keyword matching
- "Correct this" button to retrain suggestions

---

## TASK-005 — PSD2 / Deutsche Bank OAuth2 Integration

**Difficulty:** 9/10
**Priority:** High (core feature)

- Implement XS2A OAuth2 flow (Deutsche Bank sandbox → production)
- Fetch accounts, balances, and transactions via PSD2 API
- Map raw bank categories to app Category enum via CategoryAgent
- Handle token refresh, rate limits, and consent re-authorization

---

## TASK-006 — Recurring Templates UI

**Difficulty:** 4/10
**Priority:** Medium

- List, add, edit, delete recurring templates (table already exists)
- Auto-generate transactions each month from active templates
- Show next scheduled date on each template row

---

## TASK-009 — React Native / Expo Mobile App

**Difficulty:** 8/10
**Priority:** Low

- Port web tabs to React Native screens
- Shared business logic via hooks (already largely portable)
- Mobile-specific layouts for charts (Victory Native or similar)
- Push notifications via Expo Notifications (replace web push)
