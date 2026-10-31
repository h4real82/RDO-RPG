---
name: obsidian-vault
description: Kuratiertes lokales RDO-RPG-Wissens-Vault mit Entscheidungen, Quellen und verknüpften Handbuchnotizen pflegen.
---

# RDO-RPG Obsidian-Vault

## Datenhoheit

- Vault: `D:/Projects/RDO-RPG/docs/Obsidian`, Connector `rdo-vault`.
- Linear führt Aufgaben, Status, Prioritäten, Abhängigkeiten und Abnahmen.
- Repository führt Code, Konfiguration, Register und technische Prüfartefakte.
- Vault erklärt Entscheidungen, Zusammenhänge und wiederverwendbare Abläufe.
- Keine automatische Obsidian-/GitHub-/Linear-Synchronisierung behaupten.

## Struktur

`Index.md` ist der einzige Einstieg im Root. Bereiche: `00_Inbox/`, `10_Projekt/`, `20_Entscheidungen/`, `30_Handbuch/`, `40_Recherche/`, `90_Vorlagen/`.

Vor einer neuen Notiz nach vorhandenem Wissen suchen. Eine Notiz beantwortet eine Frage. Quelle, Datum, Gültigkeit und Grenzen nennen. Fakten, Vorschläge und bestätigte Entscheidungen trennen. Mindestens eine bestehende Notiz verlinken.

Frontmatter: `title`, `type`, `tags`, `updated`, `status`. Wikilinks vom Vault-Root: `[[10_Projekt/Architektur|Architektur]]`. Drei eingebaute Vorlagen unter `90_Vorlagen/` verwenden; keine zusätzliche Template-Engine nötig.

## Was hier nicht neu entsteht

Keine generierten Asset-Einzelnotizen, Chatkopien, Agenten-Telemetrie, prozentualen Aktivitäts-Dashboards oder parallelen Aufgabenboards. Entwicklungsabschluss und Testergebnis stehen am Linear-Issue und gegebenenfalls im Repository-Ledger, nicht in doppelten Agentenlogs.

Der frühere Befehl `sync:kanban` ist entfernt. Alte Agenten-/Board-Verzeichnisse nicht wieder erzeugen. Gedanken zuerst in die Inbox; konkrete Umsetzung in ein vorhandenes oder neues Linear-Issue.

## Schutz und Wiederherstellung

Persönliche Notizen und Plugin-Konfiguration bleiben aus Git ausgeschlossen. Vor großem Umbau externe Sicherung inklusive Hashprüfung erstellen. Einzelne historische Erkenntnisse gezielt kuratieren statt komplette Ordner zurückzuspielen. Zugangsdaten nie lesen/ausgeben, wenn es für die Aufgabe nicht nötig ist.

Quelle: `docs/knowledge-vault.md`. Versionierte Ausgangsbasis: `docs/vault-starter/`. Benutzerauftrag vom 31.10.2026 ersetzt die frühere Antigravity-/Kanban-Hierarchie.

