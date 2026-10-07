# RDO-RPG Codex Project Directives

## Operating model

- Codex is the active agent runtime for this repository. Historical Antigravity/Gemini records in the local Obsidian vault are reference material, not active instructions.
- Use one agent by default. Use parallel agents only for independent, non-overlapping investigations with stable interfaces and isolated verification. Do not parallelize edits to the world manifest, client runtime, vault structure, or Git history.
- Before a task that needs project context, read the smallest relevant vault notes through the `rdo-vault` MCP server. Do not load raw asset batches into context; use scripts and report counts, paths, and failures.
- Follow the packaged `rdo-map-reconstruction`, `rdo-asset-pipeline`, and `obsidian-vault` skills when their workflows apply.

## ThreeJS Guard
- Dachüberhänge bei Gebäuden dürfen maximal 0.5 Einheiten über die Fassade ragen (historisch bündige Dachtraufen).
- Bei Verdeckung des Spielers zwischen Kamera und Charakter MUSS das blockierende Material (Dächer, Vordächer, Wände) stufenlos transparent werden (opacity: 0.15, depthWrite = false).

## Map Source of Truth
- Straßen, Sektoren und Gebäude richten sich strikt nach den Referenzdateien im Ordner `Media/`:
  - `Media/Valentine MAP.jpg` (Geografische Ausrichtung, S-Kurve der Hauptstraße, Bahnhof im Südosten, Zonenaufteilung)
  - `Media/Valentine Station.png` (Bahnhof, Bahnsteig, Gleisbett, Wasserturm)
  - `Media/Valentine Saints Hotel and Bank.jpg` (Zweistöckige Fassaden, Proportionen, Farbgebungen)
  - `Media/Valentine Screenshot RDO street...` (Dachüberhänge, Boardwalks, Wagenspur-Rillen)
  - `Media/Valentine Screenshot RDO with all buildings.jpg` (Gesamtdorf-Relationen, Livery Barn, Koppeln)
- `apps/client/src/world/data/rdo_world_manifest.json` ist die autoritative Laufzeitquelle für Platzierungen. Keine Straße, Schiene oder Gebäudeplatzierung darf aus Schätzung, Noise oder unbestätigter Heuristik entstehen.

## Code Guard
- Bei jedem Event-Listener (speziell Keydown wie 'E' für POI-Interaktionen, 'Tab', 'Escape' oder DOM-Clicks) sind strikte Null-Checks und defensive `try...catch`-Blöcke Pflicht.
- Kein unhandled Exception darf den Input- oder Simulations-Loop einfrieren.
- Unbekannte oder fehlende Menü-Kategorien müssen immer auf ein sauberes Fallback-Menü mit Schließen-Funktion zurückgreifen.

## Build Gate
- Jeder Agent-Task und jede Code-Modifikation schließt zwingend mit `npx pnpm -r build` ab, um TypeScript- und Bundling-Fehler sofort abzufangen.

## Asset and vault safety
- `data/raw/` und abgeleitete RDR2/RDO-Assets gelten als lokal; ihre Redistributionsrechte müssen vor einer Veröffentlichung separat geklärt werden.
- Keine Tokens, API-Schlüssel oder absolute Benutzerpfade in Git, Vault-Notizen, Prompts oder Skills aufnehmen. Der Obsidian Local-REST-API-Token bleibt lokal und muss nach einer Offenlegung rotiert werden.
- Wesentliche Änderungen als Obsidian-Log im lokalen Vault dokumentieren. Vor Kanban-Synchronisation den geplanten Scope prüfen; `pnpm sync:kanban` nur bei bewusst gewünschten Board-Änderungen ausführen.
