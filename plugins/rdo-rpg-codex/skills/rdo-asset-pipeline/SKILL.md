---
name: rdo-asset-pipeline
description: Use when inspecting, extending, validating, or documenting the RDO-RPG OpenIV-to-client asset pipeline, including YMAP/YTYP parsing, Blender conversion, texture synchronization, or placement manifests.
---

# RDO-RPG asset pipeline

## Scope and provenance

The pipeline operates on user-provided RDR2/RDO exports. Treat every raw and
derived asset as local development material unless its redistribution rights
have been independently verified. Never add proprietary game archives,
credentials, or personally identifying export paths to Git.

## Source and output locations

- `data/raw/ymap/`: exported YMAP/YTYP metadata and parser inputs.
- `data/raw/models/`: user-exported source models.
- `data/raw/textures/`: user-exported source textures.
- `data/processed/`: generated intermediate model output.
- `data/valentine_placements.json`: generated placement data for review.
- `apps/client/public/assets/models/`: client-loadable GLB output.
- `apps/client/public/assets/textures/`: client-loadable texture output.
- `apps/client/src/world/data/rdo_world_manifest.json`: authoritative runtime
  placement source. Do not replace it with inferred or randomly generated data.

## Required workflow

1. Inspect source counts and representative samples before running scripts.
2. Run `tools/process_ymap_assets.py` to parse exported placement metadata,
   generate candidate placement data, and update the Obsidian asset graph.
3. Run `tools/convert_models_blender.py` only against the intended raw-model
   set; record skipped and failed conversions.
4. Run `tools/sync_textures_to_client.py` to build the client texture manifest.
5. Compare generated placements against `rdo_world_manifest.json` and the
   reference media. The manifest, not heuristics, remains authoritative.
6. Run `npx pnpm -r build` after client or shared-code changes. For an asset
   batch, also run the focused client smoke check when available.

## Safety checks

- Preserve deterministic source-to-output mapping and never silently overwrite
  curated manifest entries.
- Report model/texture counts, missing references, skipped conversions, and
  output paths.
- Keep terrain, road, boardwalk, and building height layers distinct to avoid
  Z-fighting.
- Retain the roof-overhang and camera-occlusion guards when introducing new
  renderable geometry.
