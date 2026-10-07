# Codex workflow for RDO-RPG

Codex is the active coding runtime for RDO-RPG. The local Obsidian vault at `docs/Obsidian` remains the design and project-memory source, while its `Antigravity/` directory is retained as historical context.

## Default execution model

Use one agent for changes to the Three.js runtime, world manifest, asset pipeline, vault structure, Git history, or shared project configuration. Use a small parallel group only for independent, read-only work such as asset inventory checks or source-reference comparisons. Every parallel task must have disjoint files, a concise result contract, and independent verification.

## Skills

Install or enable the repository-local `rdo-rpg-codex` plugin. It supplies:

- `rdo-map-reconstruction` for manifest-governed world work;
- `rdo-asset-pipeline` for OpenIV export, processing, conversion, and client synchronization; and
- `obsidian-vault` for structured vault work and project logs.

See [.codex/SETUP.md](../.codex/SETUP.md) for the local MCP registration commands. The OpenAI documentation MCP is read-only. The vault filesystem MCP is limited to `docs/Obsidian`; Codex already has project workspace access.

## Security and publishing

The former Obsidian Local REST API bearer token was exposed in a legacy local note and must be rotated before using that integration again. It is deliberately not kept in this repository. Raw and derived RDR2/RDO assets remain local until their redistribution rights have been verified.
