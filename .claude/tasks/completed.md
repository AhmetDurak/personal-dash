# Completed Tasks

Auto-updated each session via the Stop hook (`hooks/log-session.sh`).
Each entry lists git commits made during that session.

---

## Session — 2026-05-24 (bootstrap)

### Commits
- 921c191 fix: node color now persists regardless of connection state
- f422468 fix: mindmap connection management + rename input color
- 9e48c83 feat: drag-to-pan mindmap canvas
- a267553 feat: multi-connection mindmap edges + fix right-click menu
- 78a8072 fix: suppress browser right-click menu on mindmap canvas
- d889815 feat: add connection pins to mindmap nodes
- 641d19c feat: mindmap — free-form drag, rope connections, click context menu
- 7fa9fde fix: inline schema SQL in migrate.ts so it survives tsc compilation
- 24f707f fix: transactions top bar wraps to two rows on mobile
- 99f35ec fix: import dropdown text color matches button
- 466a5d7 fix: run schema migrations on startup before accepting connections
- 3ccd84f fix: prevent horizontal scroll drift of TopBar on mobile
- b932f51 feat: CSV import + unified Import dropdown (PDF + CSV)
- f370dea feat: browser push notifications for due reminders
- 0ba5792 fix: mindmap control panel stacks below canvas on mobile


## Session — 2026-05-24 21:59

### Commits
- 921c191 fix: node color now persists regardless of connection state
- f422468 fix: mindmap connection management + rename input color
- 9e48c83 feat: drag-to-pan mindmap canvas
- a267553 feat: multi-connection mindmap edges + fix right-click menu
- 78a8072 fix: suppress browser right-click menu on mindmap canvas


## Session — 2026-05-24 22:26

### Commits
- 921c191 fix: node color now persists regardless of connection state
- f422468 fix: mindmap connection management + rename input color
- 9e48c83 feat: drag-to-pan mindmap canvas
- a267553 feat: multi-connection mindmap edges + fix right-click menu
- 78a8072 fix: suppress browser right-click menu on mindmap canvas


## Session — 2026-05-24 22:46

### Commits
- 4136ffb chore: auto-commit session changes — 2026-05-24 22:46
- 921c191 fix: node color now persists regardless of connection state
- f422468 fix: mindmap connection management + rename input color
- 9e48c83 feat: drag-to-pan mindmap canvas
- a267553 feat: multi-connection mindmap edges + fix right-click menu


## Session — 2026-05-24 23:10

### Commits
- ec40c6f chore: auto-commit session changes — 2026-05-24 23:06


## Session — 2026-05-24 23:22

### Commits
- 6f131e4 chore: auto-commit session changes — 2026-05-24 23:10
- ec40c6f chore: auto-commit session changes — 2026-05-24 23:06


## Plan Tasks Completed — 2026-05-24

### TASK-A — Bell Notification Fix
- Badge now counts only due reminders (`due_at <= now()`)
- "Enable notifications" button added to NotificationsPanel when permission not granted

### TASK-B — Vocabulary CSV Import
- File input in NotebookTab vocab section; bulk POST to `/api/notebook/vocabulary/bulk`

### TASK-C — Daily Log / Journal Tab
- New `journal_entries` table, `LogTab.tsx`, `useJournal.ts`; views: Today / Calendar / History

### TASK-D — Mindmap Two-Face Nodes + Bidirectional Edges
- Single-click flips node to back face (slate bg, italic); double-click edits current face
- Ctx menu "Edit front" / "Edit back"; bidirectional edges render arrowheads at both ends

### TASK-E — Vocabulary Card Flip + Inline Edit + Emoji/GIF
- `flippedCards: Set<number>` grid flip; double-click opens edit modal with image_url field
- CSV import supports `emoji` column

### TASK-F — Language Support (en / de / tr)
- `client/src/i18n/translations.ts` + `useLanguage.ts` + `LanguageContext`
- EN / DE / TR switcher in TopBar; all nav labels and action strings translated

### TASK-G — Meal Tracker
- New `foods`, `meal_logs`, `shopping_list` tables; `MealTab.tsx`, `useMeal.ts`, `meal.ts` routes
- Views: Today (4 meal cards + calorie tracker), Food Library, Shopping List

### TASK-H — Sport Tracker
- New `exercises`, `workout_templates`, `workout_logs`, `fitness_targets` tables
- `SportTab.tsx`, `useSport.ts`, `sport.ts` routes
- Views: Dashboard, Exercises (filterable), Log Workout, Targets


## Session — 2026-05-24 23:28

### Commits
- 4f889b6 chore: auto-commit session changes — 2026-05-24 23:28


## Session — 2026-05-24 23:35

### Commits
- 4f889b6 chore: auto-commit session changes — 2026-05-24 23:28


## Session — 2026-05-25 09:33

### Commits
- d737c27 chore: auto-commit session changes — 2026-05-25 09:31


## Completed from Backlog — 2026-05-25

---

## TASK-002 — Three New Charts (Savings Rate, Category Trends, Top Payees)

**Difficulty:** 4/10
**Priority:** Medium

- Savings Rate trend line (% per month) — no backend needed
- Category trend lines (one line per expense category over time) — no backend needed
- Top Payees horizontal bar (top 10 spenders for selected month) — needs new `/api/charts/top-payees` route

A full plan exists at: `.claude/plans/dreamy-foraging-puppy.md`


## Session — 2026-05-25 09:35

### Commits
- 9abb49b chore: auto-commit session changes — 2026-05-25 09:33
- d737c27 chore: auto-commit session changes — 2026-05-25 09:31


## Completed from Backlog — 2026-05-25

---

## TASK-008 — Dark Mode

**Difficulty:** 5/10
**Priority:** Low

- Tailwind `dark:` classes across all components
- Theme toggle (persisted to localStorage)
- Mindmap canvas background and SVG edges adapt to dark theme


## Session — 2026-05-25 09:41

### Commits
- 9623863 chore: auto-commit session changes — 2026-05-25 09:35
- 9abb49b chore: auto-commit session changes — 2026-05-25 09:33
- d737c27 chore: auto-commit session changes — 2026-05-25 09:31


## Completed from Backlog — 2026-05-25

---

## TASK-007 — Mindmap Multi-Workspace

**Difficulty:** 6/10
**Priority:** Low

- Allow multiple saved mindmaps (currently only one per user)
- Sidebar to switch between maps
- Each map has its own title and canvas state


## Session — 2026-05-25 10:01

### Commits
- 6401a0f chore: auto-commit session changes — 2026-05-25 09:48


## Session — 2026-05-25 10:10

### Commits
- 2b788eb chore: auto-commit session changes — 2026-05-25 10:01
- 6401a0f chore: auto-commit session changes — 2026-05-25 09:48

