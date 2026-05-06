# tasks/

Task tracker for the Finance Dashboard project. One Markdown file per task. **Status is determined by which folder the file lives in** — move the file to change its status.

## Folder Structure

```
tasks/
├── backlog/      # not started
├── in-progress/  # actively being worked on
└── done/         # completed
```

## Task Lifecycle

1. Create file in `backlog/` with the next sequential `TASK-NNN` ID.
2. When work begins: move file to `in-progress/`, fill `Started` date, commit:
   `chore(tasks): start TASK-NNN`
3. When work is done: move file to `done/`, fill `Completed` + `History Entry`, commit:
   `chore(tasks): complete TASK-NNN`

## Naming Convention

`TASK-NNN-<short-slug>.md` — three-digit zero-padded ID.

Example: `TASK-003-category-agent-code-map.md`

## Querying

```bash
# Current work in progress
ls tasks/in-progress/

# Full backlog
ls tasks/backlog/

# Find tasks by agent
grep -rl "Agent: bank" tasks/

# History of a task (when it moved)
git log --follow -- tasks/done/TASK-001-project-setup.md
```
