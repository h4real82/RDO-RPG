# Codex und Linear: verbindlicher Arbeitsablauf
Stand: 15.10.2026. Projekt: [RDO-RPG](https://linear.app/h4real82/project/rdo-rpg-d9ca7fe5de94)
Workspace h4real82, Team H4real82 (H4R), Projekt UUID ee455f7e-d0ae-4fb7-861d-f2579cf6a372.
Repository: https://github.com/h4real82/RDO-RPG
Lokaler Checkout: D:\Projects\RDO-RPG

## Verantwortlichkeit und Datenhoheit
Linear führt Aufgabenstatus, Priorität, Abhängigkeiten, Zuständigkeit und Abnahme. Repository-Dateien führen technische Details und Prüfartefakte. Obsidian bleibt Wissensquelle; historische Checkboxen dürfen Linear nicht automatisch überschreiben.
Projektlead und anfänglicher Issue-Verantwortlicher ist h4real82. Codex arbeitet in autorisierten Sitzungen; eine Zuweisung an den Menschen behauptet keine Agentendelegation.
Diese Einrichtung nutzt den verbundenen Linear-Connector. Es gibt keinen automatischen Datei-/Statusabgleich zwischen Obsidian, GitHub und Linear. Die frühere lokale Kanban-Synchronisierung (`scripts/sync_kanban.mjs`, `sync:kanban`) entfällt seit dem kuratierten Vault-Neuaufbau vom 31.10.2026. Eine ausdrücklich eingerichtete Codex-Chat-Fortsetzung ist ein eigener Mechanismus und kein Obsidian-Dateitrigger.

## Auftrag beginnen
1. AGENTS.md, dieses Runbook und das aktuelle Linear-Projekt lesen.
2. Bestehende Issue-ID oder inhaltliches Duplikat suchen; vorhandene Aufgabe fortführen. Nur neue fachliche Arbeit als neues Issue anlegen.
3. Titel beschreibt das Ergebnis. Beschreibung enthält Problem/Ziel, betroffene Dateien, Akzeptanzkriterien, Quellen und nötige Prüfungen.
4. Projekt, Meilenstein, Priorität und passende bestehende Labels setzen. Zuständigkeit bewusst wählen; keine erfundenen Termine/Estimates.
5. Blockierende Issues über native blockedBy/blocks verknüpfen. Große Arbeit in eigenständig abnehmbare Issues oder Sub-Issues teilen.
6. Nur tatsächlich begonnene Arbeit nach In Progress setzen. Vorhandene fremde/uncommittete Änderungen respektieren.

## Während der Arbeit
- Wesentliche Erkenntnisse, Umfangsänderungen und Blocker als knappe Issue-Kommentare dokumentieren. Keine Tool-Logs oder Geheimnisse hineinkopieren.
- Neue Teilaufgaben verlinken; keine unaufgeforderte Umsetzung aller Backlog-Issues.
- Bei menschlichem Input oder fehlenden Exports genaue fehlende Daten am Issue nennen. Native Blocker verwenden; keinen nicht vorhandenen Blocked-Status erfinden.
- Ist Linear nicht erreichbar: lokal in docs/Linear-Pending.md Issue-ID, Änderung und Evidenz notieren; Ausfall melden und beim nächsten Zugriff nachtragen. Keine erfolgreiche Synchronisation behaupten.

## Abschluss und Status
Backlog = zurückgestellt/noch nicht eingeplant; Todo = als nächstes vorgesehen (Abhängigkeiten können noch blockieren); In Progress = aktive Bearbeitung; In Review = konkrete prüfbare Lösung wartet auf Review; Done = alle Kriterien erfüllt und Evidenz vorhanden. Canceled/Duplicate nur mit Begründung und ggf. Verweis.
Nach Codeänderungen zwingend `npx pnpm -r build` und aufgabenbezogene Tests. Für Map-/Kollisionsarbeit zusätzlich Browser-/Route-Evidenz; ein Build reicht dafür nicht.
Abschlusskommentar: Ergebnis, betroffene Dateien, Tests mit Ausgang, verbleibende Grenzen, Commit/PR falls vorhanden. Issue-ID in Commit-/PR-Titel aufnehmen, wenn tatsächlich ein Commit/PR erstellt wird. Keine GitHub-Integration voraussetzen.
Erst danach Done. Bei weiter offener Abnahme In Review oder In Progress mit klarer Restarbeit. Nicht wegen Turn-Ende schließen.
Im Chatabschluss Issue-ID/Link und Testergebnis nennen. Lokales docs/Linear-Tracking.md dient nur als Einstieg und Bestandsimport; aktuelle Status aus Linear lesen.

## Projektrhythmus
Projektupdates bei abgeschlossenem Meilenstein, bedeutsamer Scope-Änderung oder neuem Risiko. Health nur evidenzbasiert setzen. Keine periodischen Meldungen ohne separaten Auftrag.
M0 zuerst abnehmen; M1 Foundation und M2 Gameplay danach nach Abhängigkeiten; M3 Erweiterungen bleiben Backlog. Keine Shader-Dekompilierung im aktuellen M0-Pfad.

## Wiederverwendbare Issue-Beschreibung
### Problem und Ziel
Konkreter Trigger, beobachtetes Verhalten und gewünschtes Ergebnis.
### Umfang und Quellen
Dateien, Originaldaten und relevante Referenzen.
### Akzeptanz
Prüfbare Kriterien ohne bloße Implementierungswiederholung.
### Validierung
Build, sinnvolle Tests und bei UI/Map-Arbeit konkrete Browserbelege.
### Ergebnis
Nach Durchführung ergänzen: Änderungen, Evidenz, Restpunkte, Commit/PR.

## Native Linear-Struktur
Die vorhandenen Teamstatus und Labels Bug/Improvement/Feature werden wiederverwendet. Vier Meilensteine bündeln fachliche Ergebnisse; Beziehungen bilden Blocker ab; Dokumente halten Bewertung/Workflow. Keine zusätzlichen globalen Teams oder Status nötig.
Siehe [Linear-Projekte](https://linear.app/docs/projects) und [Meilensteine](https://linear.app/docs/project-milestones).
