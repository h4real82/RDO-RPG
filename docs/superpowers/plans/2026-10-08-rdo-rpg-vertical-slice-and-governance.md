# RDO-RPG Vertical Slice and Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den manifestgesteuerten Valentine-Client zu einem überprüfbaren, browserfähigen 2.5D-Vertical-Slice fertigstellen und die Codex-/Obsidian-Governance abschließen.

**Architecture:** Player, POI-Interaktion, HUD und Minimap werden als getrennte Runtimes an die getestete World Runtime angeschlossen. Referenzposen erzeugen reproduzierbare Browser-Screenshots. Das neue Obsidian-Vault arbeitet direkt auf versionierten Markdown-Dateien; Antigravity-Logs werden erst nach Übernahme der benötigten Fakten entfernt.

**Tech Stack:** TypeScript, Three.js, Playwright, pnpm, Markdown, Obsidian Local REST API.

**Spec:** `docs/superpowers/specs/2026-10-08-rdo-rpg-restart-design.md`

## Global Constraints

- POI- und UI-Listener enthalten Null-Checks, `try/catch` und schließbaren Fallback.
- Die Minimap leitet ihre Position deterministisch aus derselben CRS-Umrechnung ab.
- Obsidian-REST-Schlüssel bleiben ausschließlich lokale Umgebungsvariablen.
- Jeder Code-Commit endet mit `npx pnpm -r build`.

## Review Focus

- Drücken von E, Tab oder Escape bei fehlender UI darf keine Eingabe einfrieren.
- Ein unbekannter POI-Typ muss ein schließbares Fallback-Menü öffnen.
- Die Minimap darf nicht von einer zweiten, abweichenden Koordinatenumrechnung abhängen.
- Vergleichsscreenshots müssen auf einer festen Kamerapose und Manifestversion beruhen.
- Das Entfernen alter Logs darf keine neuen ADRs, Runbooks oder Vault-Indexdateien löschen.

### Task 1: Player, Interaktion und Fallback-Menüs implementieren

**Files:**
- Create: `apps/client/src/game/player/PlayerController.ts`
- Create: `apps/client/src/game/interaction/InteractionRuntime.ts`
- Create: `apps/client/src/game/interaction/FallbackMenu.ts`
- Create: `apps/client/src/game/interaction/InteractionRuntime.test.ts`
- Create: `apps/client/src/game/player/PlayerController.test.ts`

**Interfaces:**
- Produces: `PlayerController.update(deltaSeconds: number): void`, `InteractionRuntime.handleKey(event: KeyboardEvent): void`, `FallbackMenu.open(message: string): void`.

- [ ] **Step 1: Write failing defensive-input tests**

Teste E/Tab/Escape bei fehlendem aktiven POI, fehlendem DOM-Knoten und unbekannter POI-Kategorie. Jeder Test erwartet Rückkehr ohne Exception und einen schließbaren Fallback bei unbekannter Kategorie.

- [ ] **Step 2: Implement player movement and interaction boundary**

Der Player Runtime veröffentlicht nur Position und Blickrichtung. Interaction Runtime darf kein World-Objekt erzeugen und fängt alle Listenerfehler lokal ab.

- [ ] **Step 3: Verify and commit**

Run: `pnpm --filter @rdo-rpg/client test && npx pnpm -r build`
Expected: PASS.
Commit: `git commit -m "feat: add defensive player interactions"`

### Task 2: HUD, deterministische Minimap und POI-Daten anschließen

**Files:**
- Create: `apps/client/src/game/presentation/Hud.ts`
- Create: `apps/client/src/game/presentation/Minimap.ts`
- Create: `apps/client/src/game/presentation/Minimap.test.ts`
- Create: `data/runtime/valentine/pois.json`
- Create: `tools/rdo_pipeline/tests/test_pois.py`

**Interfaces:**
- Consumes: `GameCoordinates`, validated POI records.
- Produces: `Minimap.project(position: GameCoordinates): MinimapPoint`.

- [ ] **Step 1: Write failing minimap projection tests**

Teste Ursprung, bekannte Referenzpunkte und eine negative Koordinate; die Werte müssen aus dem Vertragskern stammen, nicht aus lokaler UI-Mathematik.

- [ ] **Step 2: Define validated POIs**

`pois.json` enthält nur ID, Name, Manifest-Referenz, Weltposition, Interaktionsradius und Kategorie. Die Python-Prüfung lehnt fehlende Objekt-IDs und ungültige Radien ab.

- [ ] **Step 3: Implement presentation components**

HUD und Minimap konsumieren Player-/POI-Zustand über schmale Datenmodelle. DOM-Zugriffe sind nullsicher und besitzen klare `dispose()`-Methoden.

- [ ] **Step 4: Verify and commit**

Run: `pnpm --filter @rdo-rpg/client test && python -m pytest tools/rdo_pipeline/tests/test_pois.py -q && npx pnpm -r build`
Expected: PASS.
Commit: `git commit -m "feat: add valentine hud and minimap"`

### Task 3: Browser- und visuelle Referenztests erstellen

**Files:**
- Modify: `scripts/e2e-check.mjs`
- Create: `scripts/reference-render-check.mjs`
- Create: `apps/client/e2e/valentine.spec.ts`
- Create: `docs/runbooks/visual-regression.md`

**Interfaces:**
- Consumes: reference camera poses and a fixed manifest version.
- Produces: screenshot artifacts and a non-zero exit code on baseline mismatch.

- [ ] **Step 1: Replace legacy smoke assumptions with new readiness checks**

Der Test wartet auf das neue Game-Ready-Signal und prüft Laden, Bewegung, Kamera und POI-Fallback statt antiker Menüzustände.

- [ ] **Step 2: Add deterministic reference captures**

`reference-render-check.mjs` lädt jede versionierte Kamera-Pose, wartet auf die angegebenen Chunks und speichert nur in einem ignorierten Testartefaktordner.

- [ ] **Step 3: Define visual acceptance**

Das Runbook beschreibt Baseline-Erzeugung, manuelle Referenzprüfung, tolerierte Renderingunterschiede und die Blockierkriterien für falsche Straßen-, Gebäude- oder Schienenlage.

- [ ] **Step 4: Verify and commit**

Run: `pnpm test:e2e && npx pnpm -r build`
Expected: PASS.
Commit: `git commit -m "test: verify valentine vertical slice"`

### Task 4: Codex-/Obsidian-Governance abschließen und Antigravity-Logs entfernen

**Files:**
- Create: `docs/Obsidian/RDO-RPG/README.md`
- Create: `docs/Obsidian/RDO-RPG/Architecture/ADR-0001-Restart.md`
- Create: `docs/Obsidian/RDO-RPG/Runbooks/Asset-Pipeline.md`
- Create: `docs/Obsidian/RDO-RPG/Runbooks/Codex-Obsidian-Workflow.md`
- Modify: `.agents/skills/obsidian-vault/SKILL.md`
- Delete: Antigravity-Logdateien nach dokumentierter Einzelliste

**Interfaces:**
- Produces: einen durchsuchbaren Vault-Index, ADR-Verweise auf die Spezifikation und einen schlüsselneutralen lokalen REST-Workflow.

- [ ] **Step 1: Inventory and map every Antigravity log**

Erstelle vor dem Löschen eine nicht geheime Liste `docs/Obsidian/RDO-RPG/migration-log-map.md`, die pro Quelldatei entweder einen Ziel-ADR/Runbook-Link oder die Begründung „ohne dauerhafte Projektinformation“ enthält.

- [ ] **Step 2: Create new vault entry points and runbooks**

Die neuen Dokumente verweisen auf die versionierte Spezifikation und die vier Pläne. Das Workflow-Runbook erklärt: Obsidian arbeitet direkt auf den Dateien, Git löst Konflikte und `OBSIDIAN_REST_TOKEN` wird nur lokal gesetzt.

- [ ] **Step 3: Update the Obsidian skill**

Die Skill darf nur Dateien im Vault lesen oder ändern, muss Geheimnisse maskieren und verweist für Architekturänderungen auf ADRs statt freier Logdateien.

- [ ] **Step 4: Delete only mapped Antigravity logs and verify**

Lösche ausschließlich die zuvor gelisteten Alt-Logs. Prüfe danach mit `rg -n "Antigravity" docs/Obsidian` die erwarteten Archiv-/Migrationshinweise und stelle sicher, dass keine neuen Vault-Dateien gelöscht wurden.

- [ ] **Step 5: Verify and commit**

Run: `npx pnpm -r build`
Expected: PASS.
Commit: `git commit -m "docs: migrate vault to codex workflow"`
