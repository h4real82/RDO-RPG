# RDO-RPG Asset Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aus unveränderten OpenIV-Exporten einen reproduzierbaren, validierten Valentine-Runtime-Datensatz erzeugen.

**Architecture:** Python liest ausschließlich `data/raw/` und bekannte, überprüfte Zwischenartefakte. Es erzeugt Modelle, Texturverweise, ein `rdo_world_manifest.json` und einen Herkunftsbericht unter `data/runtime/valentine/`; TypeScript-Verträge validieren das finale JSON.

**Tech Stack:** Python 3.11+, pytest, existing Blender/OpenIV helper scripts, `@rdo-rpg/world-contracts` schema.

**Spec:** `docs/superpowers/specs/2026-10-08-rdo-rpg-restart-design.md`

## Global Constraints

- `data/raw/` und Referenzmedien bleiben unverändert.
- Nur manifestierte Assets dürfen Runtime-Ausgaben erreichen.
- Jeder Lauf ist mit Quellhash, Toolversion und Ergebnis dokumentiert.
- Jeder Code-Commit endet mit `npx pnpm -r build`.

## Review Focus

- Fehlende GLB- oder Texturdateien müssen den Lauf fehlschlagen lassen.
- Zwei identische Läufe müssen dieselben IDs, Chunk-IDs und Manifestsortierung erzeugen.
- YMAP-Duplikate dürfen keine doppelten Platzierungen erzeugen.
- Außen- und Innenraumdaten müssen explizit gekennzeichnet sein.
- Der Konverter darf keine Dateien außerhalb von `data/runtime/` erzeugen.

### Task 1: Pipeline-Laufzeit und Inventur definieren

**Files:**
- Create: `tools/rdo_pipeline/pyproject.toml`
- Create: `tools/rdo_pipeline/src/rdo_pipeline/__init__.py`
- Create: `tools/rdo_pipeline/src/rdo_pipeline/inventory.py`
- Create: `tools/rdo_pipeline/tests/test_inventory.py`
- Create: `docs/runbooks/asset-pipeline.md`

**Interfaces:**
- Produces: `build_inventory(raw_root: Path) -> AssetInventory` und maschinenlesbares `data/runtime/valentine/inventory.json`.

- [ ] **Step 1: Write failing inventory tests**

Fixtures enthalten ein Modell, eine Textur, eine YMAP und eine unbekannte Erweiterung. Der Test erwartet stabile Sortierung, SHA-256 je Quelle und eine explizite Kategorie für die unbekannte Datei.

- [ ] **Step 2: Run pytest to verify failure**

Run: `python -m pytest tools/rdo_pipeline/tests/test_inventory.py -q`  
Expected: FAIL because the package is absent.

- [ ] **Step 3: Implement read-only inventory**

`build_inventory` öffnet Quellen nur lesend, verwendet relative POSIX-Pfade und schreibt keine Nebenprodukte neben Rohdaten.

- [ ] **Step 4: Add the runbook**

Dokumentiere Python-/Blender-Version, Eingaben, Ausgaben, Speicherbedarf, Fehlercodes und den Wiederanlauf ohne manuelle Dateikorrektur.

- [ ] **Step 5: Verify**

Run: `python -m pytest tools/rdo_pipeline/tests/test_inventory.py -q && npx pnpm -r build`  
Expected: PASS.

- [ ] **Step 6: Commit**

`git commit -m "feat: add read-only asset inventory"`

### Task 2: Deterministischen Valentine-Manifest-Build implementieren

**Files:**
- Create: `tools/rdo_pipeline/src/rdo_pipeline/manifest.py`
- Create: `tools/rdo_pipeline/src/rdo_pipeline/validate.py`
- Create: `tools/rdo_pipeline/src/rdo_pipeline/cli.py`
- Create: `tools/rdo_pipeline/tests/test_manifest.py`
- Create: `tools/rdo_pipeline/tests/test_validate.py`
- Create: `data/runtime/valentine/.gitkeep`

**Interfaces:**
- Consumes: `AssetInventory`, vorhandene geprüfte YMAP-/Placements-Parser.
- Produces: `build_manifest(inventory: AssetInventory, placement_sources: Sequence[Path]) -> WorldManifest` and `validate_runtime(runtime_root: Path) -> ValidationReport`.

- [ ] **Step 1: Write failing manifest tests**

Test stabile ID-Erzeugung aus Quellpfad und Placement, 250-m-Chunk-Zuordnung, Layerzuordnung und Vermeidung eines doppelten Placement-Schlüssels.

- [ ] **Step 2: Implement canonical manifest serialization**

Sortiere Objekte nach `id`, serialisiere mit fester Einrückung und schreibe `rdo_world_manifest.json` plus `provenance.json` atomar nach `data/runtime/valentine/`.

- [ ] **Step 3: Write failing validation tests**

Test fehlendes Asset, nicht endliche Koordinate, falscher Chunk und nicht erlaubter Layer. Jeder Fall muss einen eindeutigen Fehlercode enthalten.

- [ ] **Step 4: Implement runtime validation and CLI**

`python -m rdo_pipeline.cli build-valentine` erzeugt Inventur, Manifest und Report; `validate-valentine` prüft die Ausgabe erneut über den öffentlichen Vertrag.

- [ ] **Step 5: Verify a fixture build and the workspace**

Run: `python -m pytest tools/rdo_pipeline/tests -q && npx pnpm -r build`  
Expected: PASS.

- [ ] **Step 6: Commit**

`git commit -m "feat: build validated valentine runtime manifest"`

### Task 3: Visuelle Referenzdatensätze festlegen

**Files:**
- Create: `docs/reference/valentine-reference-shots.md`
- Create: `data/runtime/valentine/reference-camera-poses.json`
- Create: `tools/rdo_pipeline/tests/test_reference_poses.py`

**Interfaces:**
- Produces: versionierte Kamera-Posen mit Referenzbild-ID und erwarteten Weltkoordinaten.

- [ ] **Step 1: Add failing reference-pose tests**

Teste eindeutige IDs, orthografische Kameraart, gültige Position/Zielpunkt und vorhandene Referenzdatei.

- [ ] **Step 2: Add the approved comparison views**

Mindestens Bahnhof, Hauptstraßen-S-Kurve, Hotel/Bank, Saloon und Livery-Barn; jede Pose verweist auf die passende Datei in `Media/`.

- [ ] **Step 3: Verify and commit**

Run: `python -m pytest tools/rdo_pipeline/tests -q && npx pnpm -r build`  
Expected: PASS.  
Commit: `git commit -m "docs: define valentine visual reference set"`
