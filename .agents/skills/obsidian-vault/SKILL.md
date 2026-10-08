---
name: obsidian-vault
description: Maintain the versioned RDO-RPG Obsidian vault when architecture notes or project runbooks need coordinated Codex edits.
---

# RDO-RPG Obsidian Vault

The vault is `docs/Obsidian/`; its Markdown files are the shared source used by Obsidian and Codex. Git is the history and conflict-resolution authority.

- Read or change only files inside `docs/Obsidian/` unless the request explicitly includes another project artifact.
- Never place REST tokens, environment values, or HTTP authorization headers in Markdown, Git, or command output. Use only `OBSIDIAN_REST_TOKEN` from the local environment when a configured local REST operation is necessary.
- Record architecture decisions as ADRs with links to the corresponding versioned specification or implementation plan; do not treat transient agent logs as durable design sources.
- Before removing legacy Antigravity material, add each exact source path to `migration-log-map.md` and state its new ADR/runbook destination or that it contains no durable project information.
- Keep links relative and Markdown-portable so Obsidian and Git viewers render the same knowledge base.
