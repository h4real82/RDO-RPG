# Codex setup for RDO-RPG

This repository supplies the `rdo-rpg-codex` local plugin through
`.agents/plugins/marketplace.json`. Codex loads `.codex/config.toml` only for
a trusted project. After cloning or pulling this repository, restart Codex,
trust the project when prompted, then enable **RDO-RPG Local Plugins** from
the Plugins Directory if it is not already enabled.

## MCP servers

Codex already has direct workspace-file access. Do not add a broad filesystem
MCP server for `D:\Projects`.

Register the Obsidian vault server in the local Codex profile:

```powershell
codex mcp add rdo-vault -- npx -y @modelcontextprotocol/server-filesystem "D:\Projects\RDO-RPG\docs\Obsidian"
```

Register the official OpenAI developer documentation server:

```powershell
codex mcp add openaiDeveloperDocs --url https://developers.openai.com/mcp
```

Confirm both registrations:

```powershell
codex mcp list
```

The Local REST API token for Obsidian is a machine-local secret. Keep it in
the Obsidian plugin configuration or a local environment variable; never add
it to the repository, a skill, a prompt, or a vault note.

## Operating model

Use one Codex agent by default. Start parallel agents only when each task has
independent files, a stable interface, and a verification command that can run
without shared mutable state. For this repository, map or asset audits may be
parallelized; changes to the world manifest, client runtime, vault structure,
or Git history stay single-agent.
