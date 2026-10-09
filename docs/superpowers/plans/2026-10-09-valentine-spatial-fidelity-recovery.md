# Valentine Spatial Fidelity Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the local 2.5D Valentine slice visibly and measurably match the RDR2 map before further route, gameplay, or detail work continues.

**Architecture:** Treat exported OpenIV YMAP/YTYP/YDR data as the geometric authority and the annotated map as the visual acceptance reference. First calibrate the coordinate basis with asymmetric landmarks and readable signage, then build an exterior-only world-state manifest, close only the route-critical asset gaps, and validate the result with repeatable top-down overlays and WASD walks.

**Tech Stack:** Python 3.11 pipeline, Blender 3.2/RedDeadBlend2, TypeScript, Three.js, Vitest, Playwright, Obsidian Markdown.

**Spec:** `docs/superpowers/specs/2026-10-08-rdo-rpg-restart-design.md`; user reference `Media/Valentine MAP.jpg` plus the annotated route image supplied on 2026-10-09.

## Global Constraints

- No procedural or guessed buildings, roads, rails, or terrain.
- World placements and rotations come from exported source records and the versioned runtime manifest.
- Do not export more detail until the coordinate-basis gate passes.
- Exterior preview excludes MLO interiors, optional entity sets, lockdown variants, reflection helpers, rain/VFX helpers, and redundant LOD shells unless a documented active-state rule selects them.
- Roof overhangs remain source-authored and may not be enlarged beyond 0.5 units.
- Player occluders fade to opacity 0.15 with `depthWrite = false`.
- Every code task ends with `npx pnpm -r build`.

## Review Focus

- A readable asymmetric sign must not be mirrored after the final transform.
- Station, church, hotel/bank block, saloon/jail block, and western stable must preserve handedness and relative order from the reference map.
- Exterior and interior variants must never render simultaneously in the street preview.
- Missing route-critical geometry must fail coverage validation instead of silently disappearing.
- Top-down validation must use a fixed north-up camera and fixed bounds, not a flattering free camera.

---

### Task 1: Freeze a spatial calibration fixture

**Files:**
- Create: `tools/rdo_pipeline/src/rdo_pipeline/spatial_calibration.py`
- Create: `tools/rdo_pipeline/tests/test_spatial_calibration.py`
- Create: `data/reference/valentine/spatial-anchors.json`
- Create: `docs/runbooks/valentine-spatial-calibration.md`

**Interfaces:**
- Consumes: raw `D:/Projects/RDO-RPG/data/valentine_placements.json`, exported YMAP XML, and named map references.
- Produces: `load_spatial_anchors(path: Path) -> tuple[SpatialAnchor, ...]` and a checked-in anchor set for station, church, hotel, bank, saloon, jail/sheriff, western stable, and the road junctions marked by the user.

- [ ] Write failing tests that reject duplicate anchors, unknown source records, non-finite transforms, and fewer than five non-collinear exterior anchors.
- [ ] Implement the typed anchor loader and source-record verification; every anchor stores its source file, archetype/model, game position, and reference-map label.
- [ ] Record the anchor fixture from existing exports without manually adjusting coordinates.
- [ ] Document the current evidence baseline: 2,263 source exterior entities, 2,188 interior entities, 186 rendered exterior placements, 408 rendered interior placements, 11 terrain placements, and 1,581 missing model references.
- [ ] Run `tools/rdo_pipeline/.venv/Scripts/python.exe -m pytest tools/rdo_pipeline/tests/test_spatial_calibration.py -q` and `npx pnpm -r build`.
- [ ] Commit as `test: freeze Valentine spatial anchors`.

### Task 2: Prove the coordinate basis and eliminate mirrored geometry

**Files:**
- Modify: `tools/rdo_pipeline/src/rdo_pipeline/placements.py`
- Modify: `tools/rdo_pipeline/src/rdo_pipeline/terrain_placements.py`
- Modify: `apps/client/src/game/ValentineRuntime.ts`
- Test: `tools/rdo_pipeline/tests/test_placements.py`
- Test: `apps/client/src/game/ValentineRuntime.test.ts`
- Create: `scripts/e2e-spatial-calibration.mjs`

**Interfaces:**
- Consumes: Task 1 anchors and unmodified GLBs.
- Produces: one documented `gameToThreeTransform` used by buildings, terrain, traces, POIs, collision, and minimap.

- [ ] Add failing handedness tests using an asymmetric local triangle and a labelled facade: determinant, world position, heading, and readable-text direction must agree.
- [ ] Render two isolated candidates from the same source data: the current `Z = gameY` plus negative local-Z scale, and a proper-rotation basis such as `Z = -gameY` without reflective instance scaling.
- [ ] Capture fixed-camera screenshots of the station and one readable Valentine sign; compare both candidates with their map orientation and reject the mirrored one.
- [ ] Implement only the winning transform in the shared pipeline/runtime boundary, removing any compensating reflection that the calibration disproves.
- [ ] Regenerate traces, POIs, terrain placements, and preview spawn through the same transform; do not patch coordinates per asset.
- [ ] Run Python transform tests, client tests, `node scripts/e2e-spatial-calibration.mjs`, and `npx pnpm -r build`.
- [ ] Commit as `fix: calibrate Valentine world handedness`.

### Task 3: Build an exterior-only active world manifest

**Files:**
- Create: `tools/rdo_pipeline/src/rdo_pipeline/world_state.py`
- Create: `tools/rdo_pipeline/tests/test_world_state.py`
- Modify: `tools/rdo_pipeline/src/rdo_pipeline/cli.py`
- Modify: `tools/rdo_pipeline/src/rdo_pipeline/manifest.py`
- Modify: `packages/world-contracts/src/world-manifest.ts`

**Interfaces:**
- Consumes: adapted placements and explicit classification rules.
- Produces: `select_world_state(placements, state='default_day') -> WorldStateSelection` with accepted and excluded records plus reasons.

- [ ] Write failing tests proving that MLO members, interior proxies, reflection/rain/VFX helpers, lockdown alternatives, and lower duplicate LOD shells are excluded from `default_day`.
- [ ] Implement explicit, auditable selection rules; never classify solely from a vague substring when source metadata is available.
- [ ] Preserve excluded records in `world-state-report.json` rather than deleting them from source data.
- [ ] Rebuild the preview manifest and assert that no exterior landmark has simultaneous mutually exclusive shells.
- [ ] Run pipeline tests, manifest validation, client tests, and `npx pnpm -r build`.
- [ ] Commit as `feat: select Valentine exterior world state`.

### Task 4: Produce route-critical coverage and OpenIV export batches

**Files:**
- Create: `tools/rdo_pipeline/src/rdo_pipeline/route_coverage.py`
- Create: `tools/rdo_pipeline/tests/test_route_coverage.py`
- Create: `data/reference/valentine/annotated-circuit.json`
- Modify: `docs/Obsidian/RDO-RPG/Runbooks/OpenIV-Targeted-Export.md`

**Interfaces:**
- Consumes: Task 1 anchors, Task 3 selected exterior records, source road traces, and the user's clockwise circuit.
- Produces: ordered `route-critical-export-targets.json` grouped into terrain, road/boardwalk, rail, landmark shell, prop/vegetation, and texture packages.

- [ ] Encode the user's circuit as named segments: station junction → southern road → west side → northern cross street → main street south → station junction.
- [ ] Write failing coverage tests requiring terrain under the corridor, recognizable landmark shells on both sides, source-backed road/boardwalk geometry, and the station rail complex.
- [ ] Resolve missing hashes through exported YTYP/archetype data and rank exports by visible silhouette contribution, not raw model detail.
- [ ] Generate small OpenIV batches with exact archive paths and destination folders; keep optional interiors and micro-props out of the first batch.
- [ ] Run the coverage test and `npx pnpm -r build`; expected result is an explicit incomplete report until each batch is imported.
- [ ] Commit as `feat: define Valentine circuit coverage gate`.

### Task 5: Restore terrain, roads, rails, and landmark silhouettes

**Files:**
- Modify: `tools/convert_models_blender.py`
- Modify: `tools/rdo_pipeline/src/rdo_pipeline/cli.py`
- Modify: `data/runtime/valentine/local-preview/rdo_world_manifest.json` through the pipeline only
- Modify: `docs/runbooks/terrain-export-evidence.md`

**Interfaces:**
- Consumes: Task 4 export batches.
- Produces: a validated source-backed runtime whose circuit has continuous ground and recognizable infrastructure.

- [ ] Import only the first coverage batch and validate hashes, source transforms, material bindings, and LOD selection.
- [ ] Add real exported road/boardwalk and rail geometry; source traces remain audit guides and must not become invented ribbon meshes.
- [ ] Add the missing large landmark shells and major vegetation groups needed to read the town shape at gameplay zoom.
- [ ] Re-run coverage after every batch and stop exporting when the circuit and landmark gate passes.
- [ ] Run pipeline validation, client tests, `node scripts/e2e-check.mjs`, and `npx pnpm -r build`.
- [ ] Commit each independently accepted batch.

### Task 6: Add fixed north-up visual comparison and circuit playtest

**Files:**
- Create: `scripts/e2e-valentine-map-compare.mjs`
- Create: `scripts/e2e-valentine-circuit.mjs`
- Create: `docs/runbooks/valentine-map-acceptance.md`
- Modify: `docs/Obsidian/RDO-RPG/Status/Valentine-Vertical-Slice.md`

**Interfaces:**
- Consumes: calibrated anchors, exterior manifest, and completed route coverage.
- Produces: fixed-camera screenshots, anchor error measurements, circuit screenshots, and a single acceptance report.

- [ ] Add a fixed north-up orthographic overview whose bounds include the station, church, stable, and town core.
- [ ] Overlay labelled anchor markers and report positional error; no freehand image warp may hide a reflection or axis swap.
- [ ] Verify the user's circuit with real WASD input, collision enabled, no debug teleport after the start, and screenshots at every named segment.
- [ ] Fail on missing terrain, mirrored calibration sign, unhandled console error, inaccessible segment, or landmark-anchor mismatch.
- [ ] Update Obsidian with the screenshots, coverage counts, remaining omissions, and exact local start command.
- [ ] Run all tests, both E2E scripts, and `npx pnpm -r build`.
- [ ] Commit as `test: accept Valentine map fidelity and circuit`.

## Completion Gate

The spatial recovery is complete only when the fixed north-up overview is recognizable against the user's annotated map; asymmetric signage reads correctly; all eight anchors preserve source-relative order and orientation; the exterior preview contains no active interiors or conflicting state variants; the full marked circuit is walkable with WASD on source terrain; and the build, pipeline, manifest, browser, and Obsidian gates all pass.
