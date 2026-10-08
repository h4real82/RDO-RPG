# Codex–Obsidian-Verbindungsprüfung

## Verifiziert am 2026-10-08

Eine neue Kontrollnotiz wurde im Haupt-Vault durch Codex angelegt.
Die REST-API ergänzte einen Rückmarker. Anschließend lieferten sowohl
`vault_read` als auch der Datei-MCP denselben Inhalt mit beiden Markern.
Die erste REST-Abfrage direkt nach der Dateierstellung meldete noch
„File not found“; die spätere Abfrage war erfolgreich. Neu angelegte
Dateien deshalb nicht aufgrund einer einzelnen sofortigen Abfrage als
Verbindungsfehler einstufen.

Geprüfter gemeinsamer Pfad: `D:\Projects\RDO-RPG\docs\Obsidian`.
Vault-relative Kontrollnotiz: `RDO-RPG/Runbooks/Codex-Connection-Check.md`.
Keine Zugangsdaten wurden gelesen, angezeigt oder gespeichert.

## Grenzen

Die bidirektionale Datei-/API-Bearbeitung ist für das Haupt-Vault belegt.
Der laufende Datei-MCP verwendet weiterhin den Haupt-Checkout; der separate
Arbeits-Worktree ist nicht automatisch mit Obsidian synchronisiert.
Diese versionierte Notiz dokumentiert den Test, nicht einen Live-Sync.
Die separat angelegte Kontrollnotiz im Haupt-Checkout bleibt als bekannte,
noch unversionierte Änderung erhalten. Andere Haupt-Checkout-Dateien
wurden für den Test nicht verändert.

Obsidian startet keine Codex-Aufgaben automatisch. Git-Übernahme und
Konfliktprüfung bleiben Teil des dokumentierten Worktree-Workflows.
