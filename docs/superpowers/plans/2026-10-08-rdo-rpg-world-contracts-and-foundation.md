# RDO-RPG World Contracts and Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Einen isolierten, getesteten Vertragskern für RDO-Weltdaten und eine saubere Neustart-Arbeitsbasis schaffen.

**Architecture:** `packages/world-contracts` definiert die alleinigen TypeScript- und JSON-Schemas für Manifest, Koordinaten, Layer und Chunks. Der bestehende Client bleibt bis Paket 3 unverändert; die Verträge sind unabhängig von Three.js und Python lesbar.

**Tech Stack:** TypeScript 5, Zod, Vitest, pnpm workspaces.

**Spec:** `docs/superpowers/specs/2026-10-08-rdo-rpg-restart-design.md`

## Global Constraints

- Kein Schreibzugriff auf `data/raw/`.
- `CHUNK_SIZE` ist exakt `250`.
- CRS und Layerwerte entsprechen der Spezifikation.
- Jede Codeänderung endet mit `npx pnpm -r build`.

## Review Focus

- Negative Koordinaten müssen in denselben Chunk wie die Pipeline fallen.
- Ein unbekannter Objekttyp oder Assetpfad muss Schemafehler liefern, nicht stillschweigend ignoriert werden.
- Rotation und Skalierung müssen vollständig deterministisch serialisierbar sein.
- Ein fehlender Höhenwert darf nicht zu einem stillen Nullwert werden.
- Der Vertragskern darf keine Three.js- oder Browserabhängigkeit importieren.

### Task 1: Isolierte Neustart-Arbeitsbasis anlegen

**Files:**
- Create: `docs/adr/0001-restart-worktree-and-data-boundaries.md`
- Modify: `.gitignore`

**Interfaces:**
- Produces: dokumentierte Regeln für Worktree, Rohdaten und generierte Daten.

- [ ] **Step 1: Dokumentiere die zu schützenden Pfade und den Worktree-Workflow**

`docs/adr/0001-restart-worktree-and-data-boundaries.md` benennt `data/raw/` als unveränderlich, `data/runtime/` als generiert und verbietet gemischte Commits mit bestehendem Altstand.

- [ ] **Step 2: Ergänze ausschließlich generierte Neustart-Ausgaben in `.gitignore`**

Ignoriere Pipeline-Caches, temporäre Referenzrender und lokale Vault-Konfigurationen; ignoriere weder Manifeste noch ihre Prüfberichte.

- [ ] **Step 3: Prüfe die Arbeitsbasis**

Run: `git status --short`
Expected: Nur bekannte Altänderungen oder explizit neu angelegte Neustart-Dateien; keine Rohdatenänderung.

- [ ] **Step 4: Commit**

`git commit -m "chore: establish restart data boundaries"`

### Task 2: `@rdo-rpg/world-contracts` erstellen

**Files:**
- Create: `packages/world-contracts/package.json`
- Create: `packages/world-contracts/tsconfig.json`
- Create: `packages/world-contracts/src/constants.ts`
- Create: `packages/world-contracts/src/coordinates.ts`
- Create: `packages/world-contracts/src/manifest.ts`
- Create: `packages/world-contracts/src/index.ts`
- Create: `packages/world-contracts/test/coordinates.test.ts`
- Create: `packages/world-contracts/test/manifest.test.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: `toGameCoordinates(lng: number, lat: number): GameCoordinates`, `getChunkId(x: number, z: number): string`, `worldManifestSchema`, `WORLD_LAYERS`, `CHUNK_SIZE`.

- [ ] **Step 1: Add failing coordinate tests**

Test `toGameCoordinates(111.29, -63.6)` returns `{ x: 0, z: 0 }`; test positive and negative chunk boundaries; test exact layer constants.

- [ ] **Step 2: Run contract tests to verify failure**

Run: `pnpm --filter @rdo-rpg/world-contracts test`
Expected: FAIL because the workspace package and exports do not exist.

- [ ] **Step 3: Implement constants and pure coordinate functions**

`constants.ts` exports `CHUNK_SIZE = 250` and immutable world-layer values. `coordinates.ts` uses the CRS formulas verbatim and floors chunk indices deterministically.

- [ ] **Step 4: Add failing manifest schema tests**

Test acceptance of a minimal valid asset placement and rejection of missing asset path, invalid layer, non-finite transform and absent height.

- [ ] **Step 5: Implement manifest schema and public exports**

Use Zod to parse only JSON-safe primitives. A placement contains stable `id`, `asset`, `position`, `rotation`, `scale`, `layer`, `chunkId`, `lod` and optional semantic tags.

- [ ] **Step 6: Verify package and workspace build**

Run: `pnpm --filter @rdo-rpg/world-contracts test && npx pnpm -r build`
Expected: PASS.

- [ ] **Step 7: Commit**

`git commit -m "feat: add world data contracts"`
