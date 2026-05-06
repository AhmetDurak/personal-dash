# TASK-001: Project Infrastructure Setup

## Metadata
- **ID**: TASK-001
- **Status**: backlog
- **Priority**: high
- **Agent**: infra
- **Created**: 2026-05-06
- **Started**: 
- **Completed**: 
- **History Entry**: 

## Description
Initialize the git repository, create the `history/` and `tasks/` tracking structure, add `.gitignore`, and make the two foundation commits.

## Acceptance Criteria
- [ ] `git init` done, branch is `main`
- [ ] `.gitignore` covers Node, TS, React Native, Expo, secrets
- [ ] `history/` folder created with README, template, and four type subfolders
- [ ] `tasks/` folder created with README, template, and three status subfolders
- [ ] Commit 1 contains all agent docs and CLAUDE.md files
- [ ] Commit 2 contains `history/` and `tasks/` scaffolding

## Subtasks
- [ ] Run `git init && git branch -M main`
- [ ] Create `.gitignore`
- [ ] Create `history/` structure
- [ ] Create `tasks/` structure
- [ ] Commit 1: project identity
- [ ] Commit 2: workflow tooling

## Blockers / Dependencies
None.

## Notes
After TASK-001 is complete, move this file to `tasks/done/` and fill `Completed` and `History Entry`.
