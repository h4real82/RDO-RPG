# Codex- und Obsidian-Workflow

Obsidian öffnet direkt `docs/Obsidian/`; es gibt keine Kopie oder Synchronisationsschicht. Während größere Codex-Umstrukturierungen laufen, bleibt das betroffene Obsidian-Dokument geschlossen. Danach werden Änderungen wie Code geprüft und committed.

Die lokale REST-API ist optional und erhält ihren Schlüssel ausschließlich aus `OBSIDIAN_REST_TOKEN` in der lokalen Umgebung. Der Schlüssel wird nie in Dateien, Logs oder Git geschrieben. Sie startet keine Codex-Aufgaben automatisch.

Der projektlokale MCP-Dateisystemzugriff ist auf dieses Vault begrenzt. Der schlanke Start-Wrapper `tools/obsidian-filesystem-mcp.mjs` leitet den MCP relativ zum jeweiligen Git-Checkout auf `docs/Obsidian/`; damit verwenden Haupt-Checkout und Codex-Worktree dieselben versionierten Inhalte ohne fest verdrahteten Laufwerkspfad. Architekturänderungen benötigen einen ADR-Verweis auf Spezifikation und Plan.
