---
title: "Altbestand und Wiederherstellung"
type: system
tags: [rdo]
updated: 2026-10-31
status: active
---

# Altbestand und Wiederherstellung

Der Neuaufbau vom 31.10.2026 wurde erst nach vollständiger Kopie und SHA-256-Vergleich des bisherigen Vaults begonnen.

Die lokale Sicherung liegt außerhalb des Repositorys unter:
`D:/Projects/RDO-RPG-Backups/2026-10-31-vault-cleanup/`

- `vault-original/`: alle ursprünglichen Notizen und Obsidian-Einstellungen/Plugins.
- `vault-manifest.json`: Dateipfade, Größen und SHA-256-Prüfsummen.
- `repository-original/`: betroffene lokale Dokumente und frühere Kanban-Werkzeuge.
- `gameplay-before.json`: Vergleichsbasis der Anwendungs-/Paketquellen.

## Einzelne Notiz zurückholen

1. Im Altbestand nach Thema oder Dateiname suchen.
2. Quelle, Datum und überholte Annahmen prüfen.
3. Nur benötigte Erkenntnisse in eine passende aktuelle Notiz übernehmen und hier verknüpfen.
4. Keine ganzen Asset-/Agentenordner zurückkopieren.

Für eine vollständige Rückkehr Obsidian schließen, den aktuellen Vault separat sichern und die überprüfte Originalkopie wiederherstellen. Plugin-Konfiguration kann Zugangsdaten enthalten und bleibt lokal.

[[30_Handbuch/Vault-pflegen|Pflege]] · [[Index|Start]].

