# RDO-RPG Project Directives (Antigravity & Gemini Agent Rules)

## ThreeJS Guard
- Dachüberhänge bei Gebäuden dürfen maximal 0.5 Einheiten über die Fassade ragen (historisch bündige Dachtraufen).
- Bei Verdeckung des Spielers zwischen Kamera und Charakter MUSS das blockierende Material (Dächer, Vordächer, Wände) stufenlos transparent werden (opacity: 0.15, depthWrite = false).

## Map Source of Truth und Spielziel
- Benutzerentscheidung vom 18.10.2026: Valentine wird eine wiedererkennbare, gut spielbare 2,5D-Map. Diese Entscheidung ersetzt ältere strengere Anforderungen an exakte originale Spielgeometrie.
- Hauptstraßen, Ortsbereiche, Landmarken und bestätigte äußere Spielgrenze bleiben Grundlage. Der große Wald bleibt dekorativ/unzugänglich. X=gameX, Y=Höhe, Z=-gameY bleiben konsistent.
- Eingänge, Laufwege, Innenräume und Treppen dürfen als `authored-gameplay` vereinfacht werden. Rampen sind erlaubt. Sichtgeometrie und Spielkollision dürfen getrennt sein; sinnvolle Wände bleiben solide, tatsächliche Zugänge frei. Pro Bereich nur eine zuständige Spielkollision.
- Kamera, Darstellung, Bewegung und Aktionen verwenden gemeinsame Gebäude-/Stockwerksdaten. Verborgene Darstellung darf Kollision und Bodenunterstützung nicht abschalten. Rennen nur draußen; innen, an Türen, Treppen und Aktionen gehen.
- Alle tatsächlichen Gebäude erhalten sicher begehbare Innenräume. Sichtbare Ausstattung soll texturiert zum Materialcharakter der importierten Gebäude passen; bekannte Originalinnenräume wiedererkennbar adaptieren. Unbekannte Originalzugänglichkeit bleibt `unknown`.
- L22 ist aus dem aktiven Scope genommen und kein Export-/Abnahmeblocker. Maßgebliche Referenzen sind gelieferte RDR2/RDO-Screenshots einschließlich P1–P8 und RenderGrenze.jpg. Media-Bilder ergänzen den Stil; die fiktive Valentine1926-Karte ist keine Grundrissvorgabe.
- Originalquellen erhalten; eigene Auswahl, Platzierung und Ersatzgeometrie kennzeichnen. Unbewiesene Modell-/Archividentität bleibt `[FLAG: Data Missing]`; Hashes sind keine belegten Dateinamen.
- Je Gebäude und Minigame eigener Ordner unter `data/reference/valentine/buildings/` beziehungsweise `data/reference/minigames/`; Registry ist Index, Detaildateien führen Inhalte.

## Code Guard
- Bei jedem Event-Listener (speziell Keydown wie 'E' für POI-Interaktionen, 'Tab', 'Escape' oder DOM-Clicks) sind strikte Null-Checks und defensive `try...catch`-Blöcke Pflicht.
- Kein unhandled Exception darf den Input- oder Simulations-Loop einfrieren.
- Unbekannte oder fehlende Menü-Kategorien müssen immer auf ein sauberes Fallback-Menü mit Schließen-Funktion zurückgreifen.

## Build Gate
- Jeder Agent-Task und jede Code-Modifikation schließt zwingend mit `npx pnpm -r build` ab, um TypeScript- und Bundling-Fehler sofort abzufangen.

## Aufgaben, Wissen und Git-Grenzen
- RDO-RPG-Aufträge im [Linear-Projekt](https://linear.app/h4real82/project/rdo-rpg-d9ca7fe5de94) verfolgen. Bestehendes Issue wiederverwenden, nur begonnene Arbeit auf In Progress setzen. Done nur mit erfüllten Kriterien und frischer Evidenz; Build allein ist keine Map-/Gameplay-Abnahme.
- GitHub führt Code, Schemas, Register und Pipeline-Werkzeuge. Rohdaten, Runtime-Binärdateien und Texturpakete bleiben lokal. In gemischten Checkouts nur geprüfte Aufgaben-Dateien stagen; kein `git add .`.
- Das persönliche Vault `docs/Obsidian/` bleibt vollständig aus Git ausgeschlossen. Aufbau und Datenhoheit stehen in `docs/knowledge-vault.md`, die Ausgangsbasis unter `docs/vault-starter/`.
- Keine alten Agentenlogs, Asset-Einzelnotizen oder parallelen Kanban-Boards neu erzeugen. Linear führt Status; Obsidian führt Entscheidungen und wiederverwendbares Wissen. Keine automatische Synchronisierung behaupten.
- Secrets weder ausgeben noch versionieren. Supabase für relationale Spielzustände nutzen; keine Modell-/Textur-Binärdaten in Postgres, keine implizite Live-Migration oder Massenverteilung von Assets.
