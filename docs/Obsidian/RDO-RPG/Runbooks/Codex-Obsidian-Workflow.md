# Codex- und Obsidian-Workflow

Obsidian öffnet direkt `docs/Obsidian/`; es gibt keine Kopie oder Synchronisationsschicht. Während größere Codex-Umstrukturierungen laufen, bleibt das betroffene Obsidian-Dokument geschlossen. Danach werden Änderungen wie Code geprüft und committed.

Die lokale REST-API ist optional und erhält ihren Schlüssel ausschließlich aus `OBSIDIAN_REST_TOKEN` in der lokalen Umgebung. Der Schlüssel wird nie in Dateien, Logs oder Git geschrieben. Sie startet keine Codex-Aufgaben automatisch.

Der projektlokale MCP-Dateisystemzugriff ist auf dieses Vault begrenzt. Architekturänderungen benötigen einen ADR-Verweis auf Spezifikation und Plan.
