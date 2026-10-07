---
name: obsidian-vault
description: Use when reading, creating, updating, or logging RDO-RPG design, quest, NPC, system, pipeline, or task documentation in the local Obsidian vault.
---

# RDO-RPG Obsidian vault workflow

## Location and authority

- Vault root: `docs/Obsidian`.
- Access it with the narrowly scoped `rdo-vault` MCP server when available; the repository workspace is otherwise readable directly by Codex.
- Existing `Antigravity/` notes are historical records. Do not rewrite their execution history just to change product terminology.
- Put new active operating notes under `Codex/`; preserve the existing `RDO-RPG/`, `Externe_Tasks/`, `NOTES/`, and `Obsidian/config/_templates/` content structure.

## Writing notes

1. Read the closest matching template from `Obsidian/config/_templates/` first.
2. Preserve YAML frontmatter with `title`, `type`, `tags`, `updated`, and `status` whenever the template defines those fields.
3. Use relative Obsidian wikilinks, for example `[[RDO-RPG/Planung/Kanban_Board|Kanban]]`.
4. Append important implementation logs under `RDO-RPG/LOGS/` with the date, goal, changed files, verification command, and observed result.

## Kanban and safety

- Boards remain at `Kanban.md`, `RDO-RPG/Planung/Kanban_Board.md`, and `Externe_Tasks/Planung/Kanban_Externe_Tasks.md`.
- Inspect the affected board scope before running `pnpm sync:kanban`; the sync script can modify multiple boards.
- Never write passwords, bearer tokens, or API keys to a note. Keep Obsidian Local REST API credentials inside the local plugin configuration only.
