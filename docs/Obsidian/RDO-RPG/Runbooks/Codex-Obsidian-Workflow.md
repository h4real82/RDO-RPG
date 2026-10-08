# Codex- und Obsidian-Workflow

Obsidian öffnet direkt `docs/Obsidian/`; es gibt keine Kopie oder Synchronisationsschicht. Während größere Codex-Umstrukturierungen laufen, bleibt das betroffene Obsidian-Dokument geschlossen. Danach werden Änderungen wie Code geprüft und committed.

Die lokale REST-API ist optional und erhält ihren Schlüssel ausschließlich aus `OBSIDIAN_REST_TOKEN` in der lokalen Umgebung. Der Schlüssel wird nie in Dateien, Logs oder Git geschrieben. Sie startet keine Codex-Aufgaben automatisch.

Der projektlokale MCP-Dateisystemzugriff ist auf dieses Vault begrenzt.
Codex verwendet dafür `.codex/config.toml` in einem vertrauenswürdigen Projekt;
`.agents/mcp_config.json` allein registriert keinen nativen Codex-MCP.
Der Start-Wrapper `tools/obsidian-filesystem-mcp.mjs` leitet den MCP relativ zum
jeweiligen Git-Checkout auf `docs/Obsidian/`.

**Worktrees besitzen separate Vault-Dateien.** Versionierung ist keine laufende
Synchronisation. Für bidirektionale Bearbeitung müssen Obsidian und Codex
denselben absoluten Vault-Pfad verwenden. Bei Arbeit in einem Worktree dessen
`docs/Obsidian/` als Vault öffnen; alternativ Änderungen nach Prüfung über Git
in den Haupt-Checkout übernehmen. Keine automatische Kopie zwischen Checkouts
und keine Überschreibung uncommitteter Haupt-Checkout-Dokumente.

Nach Konfigurationsänderungen den MCP in Codex neu starten. Mit
`codex mcp get rdo-vault` aus dem jeweiligen Projekt prüfen, dass der Wrapper
registriert ist. Der folgende direkte Servertest beweist die Startfähigkeit,
aber nicht, dass eine bereits laufende Codex-Sitzung ihre Werkzeuge neu geladen
hat. Architekturänderungen benötigen einen ADR-Verweis auf Spezifikation und Plan.

Die Verbindung wird ohne Schreibzugriff auf Vault-Inhalte geprüft mit:

```powershell
node --test tools/obsidian-filesystem-mcp.test.mjs
```

Der Test prüft Checkout-Auflösung, den Windows-Startpfad und einen echten
MCP-Handshake mit den Werkzeugen `read_file` und `write_file`.
