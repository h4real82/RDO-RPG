# RDO-RPG Valentine World Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den neuen Three.js-Client mit manifestgesteuertem Chunk-Streaming, orthografischer Kamera und korrektem Sichtschutz erzeugen.

**Architecture:** Ein neuer `apps/client/src/game`-Baum konsumiert ausschließlich `@rdo-rpg/world-contracts` und das generierte Valentine-Manifest. Die alte Weltimplementierung wird erst nach einer funktionalen Parität entfernt; Debug-Werkzeuge bleiben explizit getrennt.

**Tech Stack:** TypeScript, Three.js, Vite, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-08-rdo-rpg-restart-design.md`

## Global Constraints

- 250-m-Chunks, feste Layer und manifestgesteuerte Geometrie.
- Keine Zufalls- oder Heuristikplatzierung.
- Dachüberhang maximal 0.5; Occluder `opacity 0.15`, `depthWrite false`.
- Jeder Code-Commit endet mit `npx pnpm -r build`.

## Review Focus

- Der Spieler am Chunkrand darf nicht doppelte oder fehlende Objekte sehen.
- Entladene Chunks dürfen keine GPU-Geometrie oder Texturen behalten.
- Ein fehlendes Modell darf die Render- oder Eingabeschleife nicht beenden.
- Die orthografische Kamera darf nicht versehentlich perspektivisch werden.
- Verdeckende Wände und Dächer müssen nach dem Verlassen der Sichtlinie vollständig zurückgesetzt werden.

### Task 1: Client-Testbasis und neues Startmodul schaffen

**Files:**
- Modify: `apps/client/package.json`
- Modify: `apps/client/vite.config.ts`
- Create: `apps/client/src/game/bootstrap.ts`
- Create: `apps/client/src/game/bootstrap.test.ts`
- Modify: `apps/client/src/main.ts`

**Interfaces:**
- Produces: `bootstrapGame(root: HTMLElement, options: GameBootstrapOptions): GameSession` with `dispose(): void`.

- [ ] **Step 1: Add a failing bootstrap test**

Mocke Renderer und Manifest-Loader. Erwartet wird, dass fehlendes Root-Element einen kontrollierten Fehler zurückgibt und `dispose()` idempotent ist.

- [ ] **Step 2: Install and configure Vitest**

Ergänze nur die Client-Testkonfiguration und einen `test`-Script; Browser-Rendering bleibt für Playwright reserviert.

- [ ] **Step 3: Implement bootstrap boundary**

`main.ts` ruft nur `bootstrapGame` auf und zeigt bei Fehlern eine schließbare, zugängliche Fehlermeldung an.

- [ ] **Step 4: Verify**

Run: `pnpm --filter @rdo-rpg/client test && npx pnpm -r build`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat: add isolated game bootstrap"`

### Task 2: Manifest-Loader und Chunk-Manager implementieren

**Files:**
- Create: `apps/client/src/game/world/ManifestLoader.ts`
- Create: `apps/client/src/game/world/WorldChunkManager.ts`
- Create: `apps/client/src/game/world/WorldChunkManager.test.ts`
- Create: `apps/client/src/game/world/ResourceDisposer.ts`

**Interfaces:**
- Consumes: `WorldManifest`, `getChunkId`, `CHUNK_SIZE`.
- Produces: `WorldChunkManager.update(playerX: number, playerZ: number): Promise<void>` and `dispose(): void`.

- [ ] **Step 1: Write failing chunk tests**

Teste Laden des Spielerchunks plus Nachbarchunks, einmaliges Instanziieren, Entladen bei Grenzübertritt und Aufruf von `dispose` für Geometrie und Material.

- [ ] **Step 2: Implement validated manifest loading**

Lade JSON aus `data/runtime/valentine/`, parse über `worldManifestSchema` und liefere einen sichtbaren, nicht abstürzenden Ladefehler bei ungültiger Eingabe.

- [ ] **Step 3: Implement deterministic streaming and disposal**

Nutze Chunk-IDs aus dem Vertragskern; jeder Three-Ressourceneigentümer wird bei Entladen genau einmal freigegeben.

- [ ] **Step 4: Verify and commit**

Run: `pnpm --filter @rdo-rpg/client test && npx pnpm -r build`
Expected: PASS.
Commit: `git commit -m "feat: stream validated world chunks"`

### Task 3: Infrastruktur, Kamera und Sichtschutz implementieren

**Files:**
- Create: `apps/client/src/game/world/RibbonFactory.ts`
- Create: `apps/client/src/game/player/OrthographicFollowCamera.ts`
- Create: `apps/client/src/game/player/OcclusionController.ts`
- Create: `apps/client/src/game/player/OcclusionController.test.ts`
- Create: `apps/client/src/game/world/RibbonFactory.test.ts`

**Interfaces:**
- Produces: `createRibbon(points: readonly Vec3[], layer: WorldLayer): THREE.BufferGeometry`, `OrthographicFollowCamera.update(target: THREE.Vector3): void`, `OcclusionController.update(ray: Ray): void`.

- [ ] **Step 1: Add failing layer and occlusion tests**

Teste Quad-Strip-Geometrie, vorgeschriebene Y-Werte, Kamera-Projektion und Materialwechsel auf `0.15/false` sowie Wiederherstellung der Originalwerte.

- [ ] **Step 2: Implement ribbons and fixed world layers**

Straßen und Gleise verwenden ausschließlich manifestierte Punktfolgen; keine Box- oder Zufallsersatzgeometrie.

- [ ] **Step 3: Implement the camera and occlusion controller**

Die Kamera verwendet `THREE.OrthographicCamera`; nur der Player Runtime darf sie steuern. Occluder werden defensiv behandelt, auch wenn ein Material fehlt oder geteilt ist.

- [ ] **Step 4: Verify and commit**

Run: `pnpm --filter @rdo-rpg/client test && npx pnpm -r build`
Expected: PASS.
Commit: `git commit -m "feat: add orthographic world presentation"`
