# history/

Change log for the Finance Dashboard project. One Markdown file per change, organized by type.

## Folder Structure

```
history/
├── features/     # new capabilities added
├── fixes/        # bug fixes
├── refactors/    # internal restructuring, no behavior change
└── docs/         # documentation-only updates
```

## Naming Convention

`YYYY-MM-DD_<agent>_<short-slug>.md`

Agents: `bank` | `category` | `ledger` | `chart` | `ui` | `infra` | `shared`

Example: `2026-05-06_bank-agent_oauth2-token-endpoint.md`

## Writing an Entry

Copy `_template.md`, fill every field, then commit the entry in the **same commit** as the code change. Record the git SHA in the `Commit` field afterward.

## Querying

```bash
# All changes to the bank agent
ls history/*/bank-agent*.md

# All features this month
ls history/features/2026-05-*.md

# Find entry for a commit SHA
grep -r "abc1234" history/

# All changes by type
ls history/fixes/
```
