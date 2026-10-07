# Codex Project Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the active Antigravity-specific project workflow with a secure, repository-scoped Codex workflow while retaining historical records and the existing Obsidian vault.

**Architecture:** Package reusable repository workflows as a local Codex plugin discoverable through a repository marketplace, enable it through trusted project configuration, and keep user-machine MCP credentials outside Git. Update source instructions and vault operational notes to describe one-agent-first Codex work, with narrowly defined conditions for parallel work.

**Tech Stack:** Codex project configuration, portable Codex plugin metadata, Markdown/Obsidian, Node.js, pnpm.

**Spec:** User-approved in-chat design, 2026-10-08.

## Global Constraints

- Retain existing user changes and historical Antigravity records; do not reset, rename, or bulk-rewrite the working tree.
- Do not commit secrets or configure a broad `D:\Projects` filesystem MCP server.
- Keep `rdo_world_manifest.json` as the ground-truth placement authority and preserve all Three.js and event-listener guards.
- Every code modification ends with `npx pnpm -r build`.
- Use a single native agent for this migration; only delegate independent, non-overlapping audits in future work.

## Review Focus

- Project configuration must not store user-specific secrets or absolute home-directory paths.
- Marketplace paths must remain repository-relative and resolve inside the repository.
- The Obsidian workflow must preserve existing board paths and history while routing new operational notes to Codex.
- Asset tooling guidance must not claim that arbitrary copied RDR2 assets are safe to distribute.
- All active instructions must retain manifest, roof-overhang, occlusion, defensive-input, and build guards.

---

### Task 1: Add repo-scoped Codex plugin and project wiring

**Files:**
- Create: `.agents/plugins/marketplace.json`
- Create: `plugins/rdo-rpg-codex/plugin.json`
- Create: `plugins/rdo-rpg-codex/skills/rdo-asset-pipeline/SKILL.md`
- Create: `.codex/config.toml`
- Create: `.codex/SETUP.md`

**Interfaces:**
- Consumes: existing project root, `docs/Obsidian`, `tools/`, `apps/tools/`, `data/`.
- Produces: a discoverable local plugin and a no-secret setup guide for optional user-level MCP registration.

- [x] Create a portable plugin manifest and repository marketplace with local source `./plugins/rdo-rpg-codex`.
- [x] Add a focused asset-pipeline skill describing OpenIV inputs, preprocessing, Blender conversion, client-sync outputs, provenance checks, and validation.
- [x] Enable the plugin in trusted project configuration without global MCP credentials or machine-specific paths.
- [x] Add a setup guide for scoped vault and OpenAI documentation MCP registration, verification, and local-only Obsidian REST secrets.

### Task 2: Convert active repository and vault operating guidance to Codex

**Files:**
- Modify: `AGENTS.md`
- Create: `plugins/rdo-rpg-codex/skills/obsidian-vault/SKILL.md`
- Create: `docs/Obsidian/Codex/Overview.md`
- Create: `docs/Obsidian/Codex/Current_Task.md`
- Modify: `docs/Obsidian/Antigravity/MAS/MADashboard.md`
- Modify: `docs/Obsidian/Antigravity/Planung/Obsidian_Plugin_Integration.md`

**Interfaces:**
- Consumes: vault paths, board-sync script, and project directives.
- Produces: Codex-first active guidance while retaining `Antigravity/` as an immutable historical record.

- [x] Replace platform-specific wording in `AGENTS.md` while preserving all technical guards.
- [x] Create a Codex-native vault skill and active operational notes; keep board locations stable.
- [x] Mark the old fleet dashboard as archived and remove the exposed REST bearer token from the legacy integration note.

### Task 3: Verify, record, and publish only the migration scope

**Files:**
- Create: `docs/Obsidian/RDO-RPG/LOGS/2026-10-08_Codex_Project_Integration.md`
- Modify: `docs/Obsidian/RDO-RPG/LOGS/Overview.md`

**Interfaces:**
- Consumes: Tasks 1-2.
- Produces: audit entry, validated configuration, and a narrowly staged Git commit.

- [x] Validate JSON and TOML/Markdown references.
- [x] Run `npx pnpm -r build` and record only its observed result.
- [x] Record the migration decision and verification result in the vault log.
- [x] Stage only migration files, commit, and push the isolated branch.
